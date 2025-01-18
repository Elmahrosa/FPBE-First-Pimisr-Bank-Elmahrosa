package com.fpbe.transaction.controllers;

import com.fpbe.transaction.models.Transaction;
import com.fpbe.transaction.models.TransactionType;
import com.fpbe.transaction.models.TransactionStatus;
import com.fpbe.transaction.services.TransactionService;
import com.fpbe.common.idempotency.IdempotencyKey;

import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.core.annotation.Timed;
import lombok.extern.slf4j.Slf4j;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;

/**
 * REST controller implementing transaction endpoints for the FPBE banking system.
 * Handles both traditional banking and Pi cryptocurrency operations with comprehensive
 * validation, error handling, rate limiting, and circuit breaker patterns.
 */
@RestController
@RequestMapping("/api/v1/transactions")
@Validated
@Slf4j
public class TransactionController {

    private final TransactionService transactionService;
    private final MetricsService metricsService;

    public TransactionController(
            TransactionService transactionService,
            MetricsService metricsService) {
        this.transactionService = transactionService;
        this.metricsService = metricsService;
    }

    /**
     * Creates a new transaction with idempotency support and comprehensive validation.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimiter(name = "createTransactionLimiter")
    @CircuitBreaker(name = "createTransactionBreaker")
    @Timed(value = "transaction.create.time", description = "Time taken to create transaction")
    public Transaction createTransaction(
            @Valid @RequestBody TransactionRequest request,
            @RequestHeader("X-Idempotency-Key") @NotNull String idempotencyKey) {
        
        log.info("Creating transaction with idempotency key: {}", idempotencyKey);
        
        try {
            Transaction transaction = transactionService.createTransaction(
                request.getFromAccountId(),
                request.getToAccountId(),
                request.getAmount(),
                request.getCurrency(),
                request.getType(),
                idempotencyKey,
                request.getMetadata()
            );
            
            metricsService.recordTransactionCreation(transaction);
            return transaction;
            
        } catch (Exception e) {
            log.error("Error creating transaction", e);
            metricsService.recordTransactionError("creation");
            throw e;
        }
    }

    /**
     * Updates transaction status with validation and circuit breaker protection.
     */
    @PutMapping("/{transactionId}/status")
    @ResponseStatus(HttpStatus.OK)
    @CircuitBreaker(name = "updateStatusBreaker")
    @Timed(value = "transaction.status.update.time")
    public Transaction updateTransactionStatus(
            @PathVariable UUID transactionId,
            @Valid @RequestBody StatusUpdateRequest request) {
        
        log.info("Updating transaction status: {} -> {}", transactionId, request.getStatus());
        
        try {
            Transaction transaction = transactionService.updateTransactionStatus(
                transactionId,
                request.getStatus(),
                request.getVersion()
            );
            
            metricsService.recordStatusUpdate(transaction);
            return transaction;
            
        } catch (Exception e) {
            log.error("Error updating transaction status", e);
            metricsService.recordTransactionError("status_update");
            throw e;
        }
    }

    /**
     * Retrieves paginated transactions for an account with caching support.
     */
    @GetMapping("/account/{accountId}")
    @ResponseStatus(HttpStatus.OK)
    @RateLimiter(name = "getTransactionsLimiter")
    @Timed(value = "transaction.retrieve.time")
    public Page<Transaction> getAccountTransactions(
            @PathVariable UUID accountId,
            Pageable pageable) {
        
        log.info("Retrieving transactions for account: {}", accountId);
        
        try {
            return transactionService.getAccountTransactions(accountId, pageable);
        } catch (Exception e) {
            log.error("Error retrieving account transactions", e);
            metricsService.recordTransactionError("retrieval");
            throw e;
        }
    }

    /**
     * Retrieves transactions by type and date range with pagination.
     */
    @GetMapping("/type/{type}")
    @ResponseStatus(HttpStatus.OK)
    @RateLimiter(name = "getTransactionsByTypeLimiter")
    @Timed(value = "transaction.type.retrieve.time")
    public Page<Transaction> getTransactionsByType(
            @PathVariable TransactionType type,
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate,
            Pageable pageable) {
        
        log.info("Retrieving transactions by type: {} between {} and {}", type, startDate, endDate);
        
        try {
            return transactionService.getTransactionsByTypeAndDateRange(
                type,
                startDate,
                endDate,
                pageable
            );
        } catch (Exception e) {
            log.error("Error retrieving transactions by type", e);
            metricsService.recordTransactionError("type_retrieval");
            throw e;
        }
    }
}

/**
 * Request DTO for transaction creation.
 */
@Validated
class TransactionRequest {
    @NotNull private UUID fromAccountId;
    @NotNull private UUID toAccountId;
    @NotNull private BigDecimal amount;
    @NotNull private String currency;
    @NotNull private TransactionType type;
    private Map<String, Object> metadata;

    // Getters and setters
}

/**
 * Request DTO for status updates.
 */
@Validated
class StatusUpdateRequest {
    @NotNull private TransactionStatus status;
    @NotNull private Long version;

    // Getters and setters
}