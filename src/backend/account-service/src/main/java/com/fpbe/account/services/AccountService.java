package com.fpbe.account.services;

import com.fpbe.account.models.Account;
import com.fpbe.account.repositories.AccountRepository;
import com.fpbe.account.validators.TransactionLimitValidator;
import com.fpbe.account.audit.AuditLogger;
import com.fpbe.account.exceptions.AccountException;
import com.fpbe.account.exceptions.ValidationException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.validation.annotation.Validated;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Service class implementing core banking account management functionality.
 * Provides thread-safe business logic with comprehensive transaction management and audit support.
 *
 * @version 1.0
 * @since 2023-09-21
 */
@Service
@Validated
@Slf4j
@Transactional(isolation = Isolation.REPEATABLE_READ)
public class AccountService {

    private final AccountRepository accountRepository;
    private final TransactionLimitValidator transactionLimitValidator;
    private final AuditLogger auditLogger;

    private static final String ACCOUNT_STATUS_ACTIVE = "ACTIVE";
    private static final String ACCOUNT_STATUS_SUSPENDED = "SUSPENDED";
    private static final String ACCOUNT_STATUS_CLOSED = "CLOSED";

    /**
     * Constructs AccountService with required dependencies.
     *
     * @param accountRepository Repository for account data access
     * @param transactionLimitValidator Validator for transaction limits
     * @param auditLogger Logger for audit trail
     */
    public AccountService(
            @NotNull AccountRepository accountRepository,
            @NotNull TransactionLimitValidator transactionLimitValidator,
            @NotNull AuditLogger auditLogger) {
        this.accountRepository = accountRepository;
        this.transactionLimitValidator = transactionLimitValidator;
        this.auditLogger = auditLogger;
        log.info("AccountService initialized successfully");
    }

    /**
     * Creates a new bank account with validation and audit logging.
     *
     * @param userId Owner's UUID
     * @param accountType Type of account
     * @param currency Account currency code
     * @return Newly created account
     * @throws ValidationException if validation fails
     */
    @Transactional(propagation = Propagation.REQUIRED)
    @CacheEvict(value = "accounts", key = "#userId")
    public Account createAccount(
            @NotNull UUID userId,
            @NotNull String accountType,
            @NotNull String currency) {
        log.debug("Creating account for user: {}, type: {}, currency: {}", userId, accountType, currency);

        validateAccountCreation(userId, accountType, currency);

        Account account = new Account();
        account.setUserId(userId);
        account.setAccountType(accountType);
        account.setCurrency(currency);
        account.setBalance(BigDecimal.ZERO);
        account.setStatus(ACCOUNT_STATUS_ACTIVE);

        Account savedAccount = accountRepository.saveAndFlush(account);
        auditLogger.logAccountCreation(savedAccount);

        log.info("Account created successfully: {}", savedAccount.getId());
        return savedAccount;
    }

    /**
     * Retrieves account by ID with ownership validation.
     *
     * @param accountId Account UUID
     * @param userId Owner's UUID
     * @return Account if found and owned by user
     * @throws AccountException if account not found or access denied
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "accounts", key = "#accountId + '-' + #userId")
    public Account getAccount(@NotNull UUID accountId, @NotNull UUID userId) {
        log.debug("Retrieving account: {} for user: {}", accountId, userId);

        return accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountException("Account not found or access denied"));
    }

    /**
     * Retrieves all active accounts for a user.
     *
     * @param userId Owner's UUID
     * @return List of user's active accounts
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "accounts", key = "#userId")
    public List<Account> getUserAccounts(@NotNull UUID userId) {
        log.debug("Retrieving accounts for user: {}", userId);
        return accountRepository.findByUserIdAndStatus(userId, ACCOUNT_STATUS_ACTIVE);
    }

    /**
     * Updates account status with validation and audit logging.
     *
     * @param accountId Account UUID
     * @param userId Owner's UUID
     * @param newStatus New account status
     * @return Updated account
     * @throws AccountException if update fails
     */
    @Transactional(propagation = Propagation.REQUIRED)
    @CacheEvict(value = "accounts", allEntries = true)
    public Account updateAccountStatus(
            @NotNull UUID accountId,
            @NotNull UUID userId,
            @NotNull String newStatus) {
        log.debug("Updating account status: {} for user: {} to: {}", accountId, userId, newStatus);

        Account account = getAccount(accountId, userId);
        validateStatusTransition(account.getStatus(), newStatus);

        account.setStatus(newStatus);
        Account updatedAccount = accountRepository.saveAndFlush(account);
        auditLogger.logStatusChange(updatedAccount, account.getStatus(), newStatus);

        log.info("Account status updated successfully: {}", accountId);
        return updatedAccount;
    }

    /**
     * Retrieves paginated account list for a user.
     *
     * @param userId Owner's UUID
     * @param pageable Pagination parameters
     * @return Page of accounts
     */
    @Transactional(readOnly = true)
    public Page<Account> getUserAccountsPaginated(
            @NotNull UUID userId,
            @NotNull Pageable pageable) {
        log.debug("Retrieving paginated accounts for user: {}", userId);
        return accountRepository.findAllByUserIdWithPagination(userId, pageable);
    }

    private void validateAccountCreation(UUID userId, String accountType, String currency) {
        long activeAccounts = accountRepository.countByUserIdAndStatus(userId, ACCOUNT_STATUS_ACTIVE);
        if (!transactionLimitValidator.validateAccountCreation(userId, activeAccounts)) {
            throw new ValidationException("Account creation limit exceeded");
        }

        if (!isValidCurrency(currency)) {
            throw new ValidationException("Invalid currency code: " + currency);
        }

        if (!isValidAccountType(accountType)) {
            throw new ValidationException("Invalid account type: " + accountType);
        }
    }

    private void validateStatusTransition(String currentStatus, String newStatus) {
        if (ACCOUNT_STATUS_CLOSED.equals(currentStatus)) {
            throw new ValidationException("Cannot update closed account status");
        }

        if (!isValidStatus(newStatus)) {
            throw new ValidationException("Invalid account status: " + newStatus);
        }
    }

    private boolean isValidCurrency(String currency) {
        return currency != null && currency.length() == 3 && currency.matches("[A-Z]{3}");
    }

    private boolean isValidAccountType(String accountType) {
        return accountType != null && !accountType.trim().isEmpty();
    }

    private boolean isValidStatus(String status) {
        return status != null && (
                ACCOUNT_STATUS_ACTIVE.equals(status) ||
                ACCOUNT_STATUS_SUSPENDED.equals(status) ||
                ACCOUNT_STATUS_CLOSED.equals(status)
        );
    }
}