package com.fpbe.transaction.models;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Entity class representing financial transactions in the FPBE banking system.
 * Supports both traditional banking and Pi cryptocurrency operations with comprehensive audit capabilities.
 * Implements optimistic locking and performance-optimized indexing.
 */
@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transaction_status", columnList = "status"),
    @Index(name = "idx_transaction_created", columnList = "created_at")
})
@JsonIgnoreProperties(ignoreUnknown = true)
public class Transaction {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "reference_number", unique = true, nullable = false)
    private String referenceNumber;

    @NotNull
    @Column(name = "from_account_id")
    private UUID fromAccountId;

    @NotNull
    @Column(name = "to_account_id")
    private UUID toAccountId;

    @NotNull
    @Column(name = "amount", precision = 19, scale = 4)
    private BigDecimal amount;

    @NotNull
    @Column(name = "currency", length = 3)
    private String currency;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TransactionType type;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TransactionStatus status;

    @Version
    @Column(name = "version")
    private Long version;

    @Type(type = "jsonb")
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @NotNull
    @Column(name = "deleted", nullable = false)
    private Boolean deleted;

    /**
     * Default constructor initializing a new transaction with default values.
     */
    public Transaction() {
        this.status = TransactionStatus.PENDING;
        this.metadata = new HashMap<>();
        this.deleted = false;
    }

    /**
     * Lifecycle callback executed before persisting a new transaction.
     * Generates reference number and sets timestamps.
     */
    @PrePersist
    protected void prePersist() {
        this.referenceNumber = generateReferenceNumber();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        this.version = 0L;
    }

    /**
     * Lifecycle callback executed before updating an existing transaction.
     * Updates the timestamp and handles versioning.
     */
    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Generates a unique reference number for the transaction.
     * Format: TXN-YYYYMMDD-XXXXX (e.g., TXN-20230615-12345)
     */
    private String generateReferenceNumber() {
        return String.format("TXN-%s-%05d",
            LocalDateTime.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE),
            System.nanoTime() % 100000);
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public UUID getFromAccountId() {
        return fromAccountId;
    }

    public void setFromAccountId(UUID fromAccountId) {
        this.fromAccountId = fromAccountId;
    }

    public UUID getToAccountId() {
        return toAccountId;
    }

    public void setToAccountId(UUID toAccountId) {
        this.toAccountId = toAccountId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public Long getVersion() {
        return version;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }
}

/**
 * Enumeration of supported transaction types including Pi Network operations.
 */
enum TransactionType {
    DEPOSIT,
    WITHDRAWAL,
    TRANSFER,
    PI_MINING,
    PI_EXCHANGE,
    PI_TRANSFER,
    REVERSAL,
    FEE
}

/**
 * Enumeration of possible transaction statuses with comprehensive tracking.
 */
enum TransactionStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    CANCELLED,
    REVERSED,
    PENDING_APPROVAL,
    REJECTED
}