package com.fpbe.account.repositories;

import com.fpbe.account.models.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheConfig;
import jakarta.persistence.QueryHint;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Account entity providing optimized data access operations
 * with caching and performance monitoring support for the FPBE mobile banking system.
 *
 * @version 1.0
 * @since 2023-09-21
 */
@Repository
@CacheConfig(cacheNames = "accounts")
public interface AccountRepository extends JpaRepository<Account, UUID> {

    /**
     * Retrieves all accounts owned by a specific user with caching support.
     * Performance optimized with query hints and second-level cache.
     *
     * @param userId The UUID of the account owner
     * @return List of accounts owned by the user
     */
    @Cacheable(key = "#userId")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.cacheable", value = "true"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    List<Account> findByUserId(UUID userId);

    /**
     * Retrieves a specific account by its ID and owner's user ID with caching.
     * Ensures secure access by validating ownership.
     *
     * @param id The account UUID
     * @param userId The owner's UUID
     * @return Optional containing the account if found
     */
    @Cacheable(key = "#id + '-' + #userId")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    Optional<Account> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Retrieves all accounts owned by a user with specific status using optimized query.
     * Supports account filtering based on status (e.g., ACTIVE, SUSPENDED).
     *
     * @param userId The UUID of the account owner
     * @param status The account status to filter by
     * @return List of accounts matching the criteria
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.status = :status")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.cacheable", value = "true"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    List<Account> findByUserIdAndStatus(UUID userId, String status);

    /**
     * Retrieves paginated accounts for a user with performance optimization.
     * Supports large result sets with efficient memory usage.
     *
     * @param userId The UUID of the account owner
     * @param pageable Pagination parameters
     * @return Page of accounts
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.fetchSize", value = "50"),
        @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    Page<Account> findAllByUserIdWithPagination(UUID userId, Pageable pageable);

    /**
     * Batch updates account status with optimized query.
     * Supports bulk status updates for account management operations.
     *
     * @param userId The UUID of the account owner
     * @param oldStatus Current status to match
     * @param newStatus New status to set
     * @return Number of accounts updated
     */
    @Modifying
    @Query("UPDATE Account a SET a.status = :newStatus, a.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE a.userId = :userId AND a.status = :oldStatus")
    int updateAccountStatus(UUID userId, String oldStatus, String newStatus);

    /**
     * Retrieves accounts by currency type for a specific user.
     * Supports currency-based account filtering and management.
     *
     * @param userId The UUID of the account owner
     * @param currency The currency code to filter by
     * @return List of accounts in the specified currency
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    List<Account> findByUserIdAndCurrency(UUID userId, String currency);

    /**
     * Counts the number of active accounts for a user.
     * Supports account limit enforcement and statistics.
     *
     * @param userId The UUID of the account owner
     * @param status The account status to count
     * @return Number of accounts matching the criteria
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    long countByUserIdAndStatus(UUID userId, String status);
}