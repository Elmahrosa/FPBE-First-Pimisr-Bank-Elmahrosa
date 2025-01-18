package com.fpbe.account;

import com.fpbe.account.models.Account;
import com.fpbe.account.services.AccountService;
import com.fpbe.account.repositories.AccountRepository;
import com.fpbe.account.validators.TransactionLimitValidator;
import com.fpbe.account.audit.AuditLogger;
import com.fpbe.account.exceptions.AccountException;
import com.fpbe.account.exceptions.ValidationException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Comprehensive test suite for AccountService verifying account management operations,
 * data integrity, and error handling scenarios.
 */
@ExtendWith(MockitoExtension.class)
public class AccountServiceTests {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionLimitValidator transactionLimitValidator;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private AccountService accountService;

    private ArgumentCaptor<Account> accountCaptor;
    private static final String ACTIVE_STATUS = "ACTIVE";
    private static final String SUSPENDED_STATUS = "SUSPENDED";
    private static final String CLOSED_STATUS = "CLOSED";

    @BeforeEach
    void setUp() {
        accountCaptor = ArgumentCaptor.forClass(Account.class);
        reset(accountRepository, transactionLimitValidator, auditLogger);
    }

    @Test
    void testCreateAccountSuccess() {
        // Arrange
        UUID userId = UUID.randomUUID();
        String accountType = "SAVINGS";
        String currency = "USD";

        when(transactionLimitValidator.validateAccountCreation(eq(userId), anyLong()))
            .thenReturn(true);
        when(accountRepository.saveAndFlush(any(Account.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Account createdAccount = accountService.createAccount(userId, accountType, currency);

        // Assert
        verify(accountRepository).saveAndFlush(accountCaptor.capture());
        Account capturedAccount = accountCaptor.getValue();

        assertThat(capturedAccount)
            .satisfies(account -> {
                assertThat(account.getUserId()).isEqualTo(userId);
                assertThat(account.getAccountType()).isEqualTo(accountType);
                assertThat(account.getCurrency()).isEqualTo(currency);
                assertThat(account.getBalance()).isEqualTo(BigDecimal.ZERO);
                assertThat(account.getStatus()).isEqualTo(ACTIVE_STATUS);
                assertThat(account.getCreatedAt()).isNotNull();
                assertThat(account.getUpdatedAt()).isNotNull();
            });

        verify(auditLogger).logAccountCreation(capturedAccount);
    }

    @Test
    void testCreateAccountValidationFailure() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(transactionLimitValidator.validateAccountCreation(any(), anyLong()))
            .thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> 
            accountService.createAccount(userId, "SAVINGS", "USD"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Account creation limit exceeded");

        verify(accountRepository, never()).saveAndFlush(any());
        verify(auditLogger, never()).logAccountCreation(any());
    }

    @Test
    void testGetAccountSuccess() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account mockAccount = new Account();
        mockAccount.setId(accountId);
        mockAccount.setUserId(userId);
        mockAccount.setStatus(ACTIVE_STATUS);

        when(accountRepository.findByIdAndUserId(accountId, userId))
            .thenReturn(Optional.of(mockAccount));

        // Act
        Account retrievedAccount = accountService.getAccount(accountId, userId);

        // Assert
        assertThat(retrievedAccount)
            .isNotNull()
            .satisfies(account -> {
                assertThat(account.getId()).isEqualTo(accountId);
                assertThat(account.getUserId()).isEqualTo(userId);
                assertThat(account.getStatus()).isEqualTo(ACTIVE_STATUS);
            });
    }

    @Test
    void testGetAccountNotFound() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(accountRepository.findByIdAndUserId(accountId, userId))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> 
            accountService.getAccount(accountId, userId))
            .isInstanceOf(AccountException.class)
            .hasMessageContaining("Account not found or access denied");
    }

    @Test
    void testGetUserAccounts() {
        // Arrange
        UUID userId = UUID.randomUUID();
        List<Account> mockAccounts = Arrays.asList(
            createMockAccount(userId, "SAVINGS", "USD"),
            createMockAccount(userId, "CHECKING", "EUR")
        );

        when(accountRepository.findByUserIdAndStatus(userId, ACTIVE_STATUS))
            .thenReturn(mockAccounts);

        // Act
        List<Account> accounts = accountService.getUserAccounts(userId);

        // Assert
        assertThat(accounts)
            .hasSize(2)
            .allSatisfy(account -> {
                assertThat(account.getUserId()).isEqualTo(userId);
                assertThat(account.getStatus()).isEqualTo(ACTIVE_STATUS);
            });
    }

    @Test
    void testUpdateAccountStatus() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account mockAccount = createMockAccount(userId, "SAVINGS", "USD");
        mockAccount.setId(accountId);

        when(accountRepository.findByIdAndUserId(accountId, userId))
            .thenReturn(Optional.of(mockAccount));
        when(accountRepository.saveAndFlush(any(Account.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Account updatedAccount = accountService.updateAccountStatus(accountId, userId, SUSPENDED_STATUS);

        // Assert
        verify(accountRepository).saveAndFlush(accountCaptor.capture());
        Account capturedAccount = accountCaptor.getValue();

        assertThat(updatedAccount)
            .satisfies(account -> {
                assertThat(account.getStatus()).isEqualTo(SUSPENDED_STATUS);
                assertThat(account.getUpdatedAt()).isNotNull();
            });

        verify(auditLogger).logStatusChange(
            eq(capturedAccount), 
            eq(ACTIVE_STATUS), 
            eq(SUSPENDED_STATUS)
        );
    }

    @Test
    void testUpdateClosedAccountStatus() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account mockAccount = createMockAccount(userId, "SAVINGS", "USD");
        mockAccount.setId(accountId);
        mockAccount.setStatus(CLOSED_STATUS);

        when(accountRepository.findByIdAndUserId(accountId, userId))
            .thenReturn(Optional.of(mockAccount));

        // Act & Assert
        assertThatThrownBy(() ->
            accountService.updateAccountStatus(accountId, userId, ACTIVE_STATUS))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Cannot update closed account status");

        verify(accountRepository, never()).saveAndFlush(any());
        verify(auditLogger, never()).logStatusChange(any(), any(), any());
    }

    private Account createMockAccount(UUID userId, String accountType, String currency) {
        Account account = new Account();
        account.setUserId(userId);
        account.setAccountType(accountType);
        account.setCurrency(currency);
        account.setBalance(BigDecimal.ZERO);
        account.setStatus(ACTIVE_STATUS);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());
        return account;
    }
}