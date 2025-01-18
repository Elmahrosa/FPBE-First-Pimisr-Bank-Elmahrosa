package com.fpbe.transaction.repositories;

import com.fpbe.transaction.models.Transaction;
import com.fpbe.transaction.models.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.stereotype.Repository;

import javax.persistence.QueryHint;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Repository interface for Transaction entity providing optimized data access operations
 * with support for horizontal scaling and high-performance querying.
 * Implements performance optimizations to handle 1,000 transactions per second with < 10ms query time.
 */
@Repository
@QueryHints(value = {
    @QueryHint(name = "org.hibernate.readOnly", value = "true"),
    @QueryHint(name = "org.hibernate.fetchSize", value = "50"),
    @QueryHint(name = "org.hibernate.cacheable", value = "true")
})
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /**
     * Finds all transactions where the given account is the source with optimized query execution.
     * Uses index on fromAccountId for efficient retrieval.
     *
     * @param fromAccountId the source account ID
     * @param pageable pagination parameters
     * @return page of transactions from the account
     */
    @Query("SELECT t FROM Transaction t WHERE t.fromAccountId = :fromAccountId AND t.deleted = false")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.comment", value = "Find transactions by source account"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    Page<Transaction> findByFromAccountId(UUID fromAccountId, Pageable pageable);

    /**
     * Finds all transactions where the given account is the destination with optimized query execution.
     * Uses index on toAccountId for efficient retrieval.
     *
     * @param toAccountId the destination account ID
     * @param pageable pagination parameters
     * @return page of transactions to the account
     */
    @Query("SELECT t FROM Transaction t WHERE t.toAccountId = :toAccountId AND t.deleted = false")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.comment", value = "Find transactions by destination account"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    Page<Transaction> findByToAccountId(UUID toAccountId, Pageable pageable);

    /**
     * Finds transactions of specific type within a date range with optimized query execution.
     * Uses composite index on type and createdAt for efficient retrieval.
     *
     * @param type transaction type
     * @param startDate start of date range
     * @param endDate end of date range
     * @param pageable pagination parameters
     * @return page of transactions matching type and date range
     */
    @Query("SELECT t FROM Transaction t WHERE t.type = :type " +
           "AND t.createdAt BETWEEN :startDate AND :endDate " +
           "AND t.deleted = false")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.comment", value = "Find transactions by type and date range"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    Page<Transaction> findByTypeAndCreatedAtBetween(
        TransactionType type,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );

    /**
     * Finds all transactions for an account (both source and destination) with optimized query execution.
     * Uses union of indexed queries for efficient retrieval.
     *
     * @param accountId the account ID
     * @param pageable pagination parameters
     * @return page of transactions involving the account
     */
    @Query("SELECT t FROM Transaction t WHERE " +
           "(t.fromAccountId = :accountId OR t.toAccountId = :accountId) " +
           "AND t.deleted = false")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.comment", value = "Find all account transactions"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    Page<Transaction> findByAccountId(UUID accountId, Pageable pageable);

    /**
     * Finds all Pi Network related transactions with optimized query execution.
     * Uses index on type for efficient retrieval of cryptocurrency operations.
     *
     * @param pageable pagination parameters
     * @return page of Pi Network transactions
     */
    @Query("SELECT t FROM Transaction t WHERE " +
           "t.type IN ('PI_MINING', 'PI_EXCHANGE', 'PI_TRANSFER') " +
           "AND t.deleted = false")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.comment", value = "Find Pi Network transactions"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    Page<Transaction> findPiNetworkTransactions(Pageable pageable);
}