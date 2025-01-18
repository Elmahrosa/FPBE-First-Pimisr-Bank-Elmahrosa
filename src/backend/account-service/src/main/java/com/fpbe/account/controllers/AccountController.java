package com.fpbe.account.controllers;

import com.fpbe.account.models.Account;
import com.fpbe.account.services.AccountService;
import com.fpbe.account.dtos.CreateAccountRequest;
import com.fpbe.account.dtos.AccountResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * REST controller implementing secure account management endpoints for the FPBE mobile banking system.
 * Provides high-performance API operations with caching, rate limiting, and comprehensive security controls.
 *
 * @version 1.0
 * @since 2023-09-21
 */
@RestController
@RequestMapping("/api/v1/accounts")
@Validated
@Slf4j
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
@Tag(name = "Account Management", description = "APIs for account operations")
public class AccountController {

    private final AccountService accountService;
    private final Bucket rateLimiter;

    /**
     * Constructs AccountController with required dependencies and rate limiting configuration.
     *
     * @param accountService Service for account operations
     */
    public AccountController(AccountService accountService) {
        this.accountService = accountService;
        
        // Configure rate limiter for 100 requests per minute
        Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));
        this.rateLimiter = Bucket4j.builder().addLimit(limit).build();
        
        log.info("AccountController initialized with rate limiting configuration");
    }

    /**
     * Creates a new bank account with validation and security checks.
     *
     * @param request Account creation request
     * @return ResponseEntity containing created account
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ACCOUNT_CREATE')")
    @Operation(
        summary = "Create new account",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<Account> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        if (!rateLimiter.tryConsume(1)) {
            log.warn("Rate limit exceeded for account creation request");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        log.info("Processing account creation request for user: {}", request.getUserId());
        
        Account account = accountService.createAccount(
            request.getUserId(),
            request.getAccountType(),
            request.getCurrency()
        );
        
        log.info("Account created successfully with ID: {}", account.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(account);
    }

    /**
     * Retrieves account by ID with caching and security validation.
     *
     * @param accountId Account UUID
     * @param userId Owner's UUID from security context
     * @return ResponseEntity containing account details
     */
    @GetMapping("/{accountId}")
    @PreAuthorize("hasRole('ACCOUNT_READ')")
    @Cacheable(value = "accounts", key = "#accountId + '-' + #userId")
    @Operation(
        summary = "Get account by ID",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<Account> getAccount(
            @PathVariable @NotNull UUID accountId,
            @RequestHeader("X-User-ID") @NotNull UUID userId) {
        
        log.debug("Retrieving account: {} for user: {}", accountId, userId);
        
        Account account = accountService.getAccount(accountId, userId);
        return ResponseEntity.ok(account);
    }

    /**
     * Retrieves all active accounts for a user with pagination support.
     *
     * @param userId Owner's UUID from security context
     * @param pageable Pagination parameters
     * @return ResponseEntity containing page of accounts
     */
    @GetMapping
    @PreAuthorize("hasRole('ACCOUNT_READ')")
    @Operation(
        summary = "Get user accounts",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<Page<Account>> getUserAccounts(
            @RequestHeader("X-User-ID") @NotNull UUID userId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        log.debug("Retrieving accounts for user: {} with pagination: {}", userId, pageable);
        
        Page<Account> accounts = accountService.getUserAccountsPaginated(userId, pageable);
        return ResponseEntity.ok(accounts);
    }

    /**
     * Updates account status with validation and security checks.
     *
     * @param accountId Account UUID
     * @param userId Owner's UUID from security context
     * @param status New account status
     * @return ResponseEntity containing updated account
     */
    @PatchMapping("/{accountId}/status")
    @PreAuthorize("hasRole('ACCOUNT_UPDATE')")
    @Operation(
        summary = "Update account status",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<Account> updateAccountStatus(
            @PathVariable @NotNull UUID accountId,
            @RequestHeader("X-User-ID") @NotNull UUID userId,
            @RequestParam @NotNull String status) {
        
        if (!rateLimiter.tryConsume(1)) {
            log.warn("Rate limit exceeded for status update request");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        log.info("Updating account status: {} for user: {} to: {}", accountId, userId, status);
        
        Account updatedAccount = accountService.updateAccountStatus(accountId, userId, status);
        return ResponseEntity.ok(updatedAccount);
    }

    /**
     * Exception handler for account-related exceptions.
     *
     * @param ex The caught exception
     * @return ResponseEntity with error details
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception ex) {
        log.error("Error processing account request", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body("An error occurred processing your request");
    }
}