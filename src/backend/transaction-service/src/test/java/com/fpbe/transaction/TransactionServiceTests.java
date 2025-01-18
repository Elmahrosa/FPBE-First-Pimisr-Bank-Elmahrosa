package com.fpbe.transaction;

import com.fpbe.transaction.models.Transaction;
import com.fpbe.transaction.models.TransactionType;
import com.fpbe.transaction.models.TransactionStatus;
import com.fpbe.transaction.services.TransactionService;
import com.fpbe.transaction.repositories.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.Timeout;
import org.mockito.BDDMockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.test.context.TestPropertySource;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestPropertySource(properties = {
    "spring.kafka.bootstrap-servers=localhost:9092",
    "spring.jpa.properties.hibernate.generate_statistics=true"
})
public class TransactionServiceTests {

    @Autowired
    private TransactionService transactionService;

    @MockBean
    private TransactionRepository transactionRepository;

    @MockBean
    private KafkaTemplate<String, Transaction> kafkaTemplate;

    @MockBean
    private CircuitBreakerFactory circuitBreakerFactory;

    private final MeterRegistry metricsRegistry = new SimpleMeterRegistry();
    private final Clock testClock = Clock.fixed(Instant.parse("2023-01-01T10:00:00Z"), ZoneId.systemDefault());

    private UUID testFromAccountId;
    private UUID testToAccountId;
    private Transaction testTransaction;

    @BeforeEach
    void setUp() {
        testFromAccountId = UUID.randomUUID();
        testToAccountId = UUID.randomUUID();

        // Initialize test transaction
        testTransaction = new Transaction();
        testTransaction.setFromAccountId(testFromAccountId);
        testTransaction.setToAccountId(testToAccountId);
        testTransaction.setAmount(new BigDecimal("100.00"));
        testTransaction.setCurrency("USD");
        testTransaction.setType(TransactionType.TRANSFER);
        testTransaction.setStatus(TransactionStatus.PENDING);
        testTransaction.setMetadata(new HashMap<>());

        // Reset mocks
        reset(transactionRepository, kafkaTemplate, circuitBreakerFactory);

        // Configure circuit breaker mock
        when(circuitBreakerFactory.create(any()))
            .thenReturn(new NoOpCircuitBreaker());

        // Configure repository mock default behavior
        when(transactionRepository.save(any(Transaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @Timeout(value = 3, unit = TimeUnit.SECONDS)
    void testTransactionPerformance() throws Exception {
        // Prepare test data - 1000 transactions for performance testing
        int transactionCount = 1000;
        List<Transaction> transactions = IntStream.range(0, transactionCount)
            .mapToObj(i -> {
                Transaction tx = new Transaction();
                tx.setFromAccountId(UUID.randomUUID());
                tx.setToAccountId(UUID.randomUUID());
                tx.setAmount(new BigDecimal("100.00"));
                tx.setCurrency("USD");
                tx.setType(TransactionType.TRANSFER);
                return tx;
            })
            .collect(Collectors.toList());

        // Configure mock for batch processing
        when(transactionRepository.saveAll(anyList()))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Execute transactions concurrently
        ExecutorService executorService = Executors.newFixedThreadPool(10);
        long startTime = System.currentTimeMillis();

        List<CompletableFuture<Transaction>> futures = transactions.stream()
            .map(tx -> CompletableFuture.supplyAsync(() ->
                transactionService.createTransaction(
                    tx.getFromAccountId(),
                    tx.getToAccountId(),
                    tx.getAmount(),
                    tx.getCurrency(),
                    tx.getType(),
                    UUID.randomUUID().toString(),
                    Collections.emptyMap()
                ),
                executorService
            ))
            .collect(Collectors.toList());

        // Wait for all transactions to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        long duration = System.currentTimeMillis() - startTime;

        // Verify performance requirements
        assertThat(duration).isLessThan(3000); // Less than 3 seconds
        double tps = (double) transactionCount / (duration / 1000.0);
        assertThat(tps).isGreaterThanOrEqualTo(1000); // At least 1000 TPS
    }

    @Test
    void testPiNetworkTransactions() {
        // Prepare Pi Network transaction
        Transaction piTransaction = new Transaction();
        piTransaction.setFromAccountId(testFromAccountId);
        piTransaction.setToAccountId(testToAccountId);
        piTransaction.setAmount(new BigDecimal("10.00"));
        piTransaction.setCurrency("PI");
        piTransaction.setType(TransactionType.PI_TRANSFER);
        
        when(transactionRepository.save(any(Transaction.class)))
            .thenReturn(piTransaction);

        // Execute Pi Network transaction
        Transaction result = transactionService.createTransaction(
            testFromAccountId,
            testToAccountId,
            new BigDecimal("10.00"),
            "PI",
            TransactionType.PI_TRANSFER,
            UUID.randomUUID().toString(),
            Map.of("blockchain_hash", "0x123456789")
        );

        // Verify Pi Network specific handling
        assertThat(result.getType()).isEqualTo(TransactionType.PI_TRANSFER);
        assertThat(result.getCurrency()).isEqualTo("PI");
        verify(kafkaTemplate).send(eq("transaction-events"), any(), any());
    }

    @Test
    void testOptimisticLocking() {
        // Prepare test data
        Transaction transaction = testTransaction;
        transaction.setStatus(TransactionStatus.PENDING);
        
        when(transactionRepository.findById(any()))
            .thenReturn(Optional.of(transaction));

        // Simulate concurrent updates
        assertThatCode(() -> {
            transactionService.updateTransactionStatus(
                transaction.getId(),
                TransactionStatus.PROCESSING,
                0L
            );
        }).doesNotThrowAnyException();

        // Verify optimistic locking
        assertThatThrownBy(() -> {
            transactionService.updateTransactionStatus(
                transaction.getId(),
                TransactionStatus.COMPLETED,
                0L // Wrong version
            );
        }).isInstanceOf(IllegalStateException.class)
          .hasMessageContaining("modified by another process");
    }

    @Test
    void testEventSourcing() {
        // Prepare test data
        String idempotencyKey = UUID.randomUUID().toString();
        Transaction transaction = testTransaction;

        // Execute transaction creation
        Transaction result = transactionService.createTransaction(
            testFromAccountId,
            testToAccountId,
            new BigDecimal("100.00"),
            "USD",
            TransactionType.TRANSFER,
            idempotencyKey,
            Collections.emptyMap()
        );

        // Verify event publication
        verify(kafkaTemplate).send(
            eq("transaction-events"),
            any(),
            argThat(tx -> {
                Map<String, Object> metadata = tx.getMetadata();
                return metadata.containsKey("eventType") &&
                       metadata.get("eventType").equals("TRANSACTION_CREATED") &&
                       metadata.containsKey("eventTime");
            })
        );

        // Update transaction status
        transactionService.updateTransactionStatus(
            result.getId(),
            TransactionStatus.COMPLETED,
            0L
        );

        // Verify status update event
        verify(kafkaTemplate).send(
            eq("transaction-events"),
            any(),
            argThat(tx -> {
                Map<String, Object> metadata = tx.getMetadata();
                return metadata.containsKey("eventType") &&
                       metadata.get("eventType").equals("STATUS_UPDATED");
            })
        );
    }

    // Helper class for circuit breaker mock
    private static class NoOpCircuitBreaker implements org.springframework.cloud.client.circuitbreaker.CircuitBreaker {
        @Override
        public <T> T run(Supplier<T> toRun) {
            return toRun.get();
        }

        @Override
        public <T> T run(Supplier<T> toRun, Function<Throwable, T> fallback) {
            try {
                return toRun.get();
            } catch (Exception e) {
                return fallback.apply(e);
            }
        }
    }
}