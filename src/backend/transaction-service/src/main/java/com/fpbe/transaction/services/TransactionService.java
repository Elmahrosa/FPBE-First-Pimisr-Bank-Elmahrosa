package com.fpbe.transaction.services;

import com.fpbe.transaction.models.Transaction;
import com.fpbe.transaction.models.TransactionType;
import com.fpbe.transaction.models.TransactionStatus;
import com.fpbe.transaction.repositories.TransactionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.retry.annotation.Retry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service implementing core transaction processing logic for the FPBE banking system.
 * Handles both traditional banking and Pi cryptocurrency operations with event sourcing,
 * optimistic locking, and comprehensive status tracking.
 */
@Service
@Transactional(isolation = Isolation.REPEATABLE_READ)
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final KafkaTemplate<String, Transaction> kafkaTemplate;
    private final CircuitBreakerFactory circuitBreakerFactory;
    private final MeterRegistry metricsRegistry;

    private static final String TRANSACTION_TOPIC = "transaction-events";
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long TRANSACTION_TIMEOUT = 3000; // 3 seconds as per requirements

    /**
     * Constructs the TransactionService with required dependencies.
     */
    public TransactionService(
            TransactionRepository transactionRepository,
            KafkaTemplate<String, Transaction> kafkaTemplate,
            CircuitBreakerFactory circuitBreakerFactory,
            MeterRegistry metricsRegistry) {
        this.transactionRepository = transactionRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.circuitBreakerFactory = circuitBreakerFactory;
        this.metricsRegistry = metricsRegistry;
    }

    /**
     * Creates and processes a new transaction with idempotency support.
     * Implements comprehensive validation, status tracking, and event sourcing.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retry(maxAttempts = MAX_RETRY_ATTEMPTS)
    public Transaction createTransaction(
            UUID fromAccountId,
            UUID toAccountId,
            BigDecimal amount,
            String currency,
            TransactionType type,
            String idempotencyKey,
            Map<String, Object> metadata) {

        long startTime = System.currentTimeMillis();

        try {
            // Check idempotency
            Transaction existingTransaction = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingTransaction != null) {
                log.info("Returning existing transaction for idempotency key: {}", idempotencyKey);
                return existingTransaction;
            }

            // Validate transaction parameters
            validateTransactionParameters(fromAccountId, toAccountId, amount, currency, type);

            // Create new transaction
            Transaction transaction = new Transaction();
            transaction.setFromAccountId(fromAccountId);
            transaction.setToAccountId(toAccountId);
            transaction.setAmount(amount);
            transaction.setCurrency(currency);
            transaction.setType(type);
            transaction.setStatus(TransactionStatus.PENDING);
            transaction.setMetadata(metadata);

            // Apply business rules based on transaction type
            applyTransactionTypeRules(transaction);

            // Save transaction
            Transaction savedTransaction = transactionRepository.save(transaction);

            // Publish event
            publishTransactionEvent(savedTransaction, "TRANSACTION_CREATED");

            // Update metrics
            recordTransactionMetrics(startTime);

            log.info("Created transaction: {}", savedTransaction.getId());
            return savedTransaction;

        } catch (Exception e) {
            log.error("Error creating transaction", e);
            metricsRegistry.counter("transaction.errors").increment();
            throw e;
        }
    }

    /**
     * Updates transaction status with optimistic locking support.
     * Ensures consistent state transitions and publishes events.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Transaction updateTransactionStatus(UUID transactionId, TransactionStatus newStatus, Long version) {
        return circuitBreakerFactory.create("updateStatus").run(() -> {
            Transaction transaction = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

            // Verify version for optimistic locking
            if (!transaction.getVersion().equals(version)) {
                throw new IllegalStateException("Transaction was modified by another process");
            }

            // Validate status transition
            validateStatusTransition(transaction.getStatus(), newStatus);

            // Update status
            transaction.setStatus(newStatus);

            // Save and publish event
            Transaction updatedTransaction = transactionRepository.save(transaction);
            publishTransactionEvent(updatedTransaction, "STATUS_UPDATED");

            log.info("Updated transaction status: {} -> {}", transactionId, newStatus);
            return updatedTransaction;
        });
    }

    /**
     * Validates transaction parameters according to business rules.
     */
    private void validateTransactionParameters(
            UUID fromAccountId,
            UUID toAccountId,
            BigDecimal amount,
            String currency,
            TransactionType type) {
        
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        if (currency == null || currency.length() != 3) {
            throw new IllegalArgumentException("Invalid currency code");
        }

        if (type == null) {
            throw new IllegalArgumentException("Transaction type is required");
        }

        // Additional validation for transfer transactions
        if (type == TransactionType.TRANSFER && fromAccountId.equals(toAccountId)) {
            throw new IllegalArgumentException("Source and destination accounts cannot be the same");
        }
    }

    /**
     * Applies specific business rules based on transaction type.
     */
    private void applyTransactionTypeRules(Transaction transaction) {
        switch (transaction.getType()) {
            case PI_MINING:
                transaction.getMetadata().put("miningRate", "0.25");
                transaction.getMetadata().put("miningDuration", "1h");
                break;
            case PI_EXCHANGE:
                transaction.getMetadata().put("exchangeRate", "1.0");
                transaction.getMetadata().put("exchangeFee", "0.1%");
                break;
            case TRANSFER:
                transaction.getMetadata().put("transferType", "internal");
                break;
            default:
                break;
        }
    }

    /**
     * Validates transaction status transitions according to business rules.
     */
    private void validateStatusTransition(TransactionStatus currentStatus, TransactionStatus newStatus) {
        if (currentStatus == TransactionStatus.COMPLETED || 
            currentStatus == TransactionStatus.FAILED ||
            currentStatus == TransactionStatus.CANCELLED) {
            throw new IllegalStateException("Cannot update final status: " + currentStatus);
        }

        if (currentStatus == TransactionStatus.PENDING && 
            newStatus != TransactionStatus.PROCESSING &&
            newStatus != TransactionStatus.FAILED) {
            throw new IllegalStateException("Invalid status transition from PENDING");
        }
    }

    /**
     * Publishes transaction events to Kafka for event sourcing.
     */
    private void publishTransactionEvent(Transaction transaction, String eventType) {
        transaction.getMetadata().put("eventType", eventType);
        transaction.getMetadata().put("eventTime", LocalDateTime.now().toString());

        kafkaTemplate.send(TRANSACTION_TOPIC, transaction.getId().toString(), transaction)
                .addCallback(
                        result -> log.debug("Published event: {}", eventType),
                        ex -> log.error("Error publishing event", ex)
                );
    }

    /**
     * Records transaction metrics for monitoring and performance tracking.
     */
    private void recordTransactionMetrics(long startTime) {
        long duration = System.currentTimeMillis() - startTime;
        metricsRegistry.timer("transaction.duration").record(duration, TimeUnit.MILLISECONDS);
        metricsRegistry.counter("transaction.count").increment();

        if (duration > TRANSACTION_TIMEOUT) {
            metricsRegistry.counter("transaction.timeout").increment();
        }
    }
}