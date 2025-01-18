-- Version: PostgreSQL 15+
-- Description: Initial database migration script for FPBE mobile banking system

-- Enable UUID generation support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enums for status tracking
CREATE TYPE kyc_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'VERIFIED',
    'REJECTED'
);

CREATE TYPE transaction_type AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'PI_MINING',
    'PI_EXCHANGE'
);

CREATE TYPE transaction_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE account_type AS ENUM (
    'SAVINGS',
    'CHECKING',
    'PI_WALLET'
);

-- Create trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table with enhanced security features
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kyc_status kyc_status NOT NULL DEFAULT 'PENDING',
    biometric_data BYTEA,
    device_id VARCHAR(255),
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    profile JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_phone_format CHECK (phone_number ~* '^\+?[1-9]\d{1,14}$')
);

-- Accounts table with balance management
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_type account_type NOT NULL,
    balance DECIMAL(19,4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_balance CHECK (balance >= 0),
    CONSTRAINT check_currency_format CHECK (currency ~* '^[A-Z]{3}$')
);

-- Transactions table with comprehensive tracking
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_account_id UUID REFERENCES accounts(id),
    destination_account_id UUID REFERENCES accounts(id),
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_amount CHECK (amount > 0),
    CONSTRAINT check_different_accounts CHECK (source_account_id != destination_account_id),
    CONSTRAINT check_currency_format CHECK (currency ~* '^[A-Z]{3}$')
);

-- Pi wallet specific table
CREATE TABLE pi_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    balance DECIMAL(19,4) NOT NULL DEFAULT 0,
    mining_active BOOLEAN DEFAULT false,
    last_mined_at TIMESTAMP,
    mining_rate DECIMAL(10,4),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_pi_balance CHECK (balance >= 0),
    CONSTRAINT check_wallet_format CHECK (wallet_address ~* '^[A-Za-z0-9]{26,35}$')
);

-- Audit logging table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_device ON users(device_id);
CREATE INDEX idx_users_kyc ON users(kyc_status) WHERE kyc_status != 'VERIFIED';
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_transactions_source ON transactions(source_account_id);
CREATE INDEX idx_transactions_destination ON transactions(destination_account_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_pi_wallets_user ON pi_wallets(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Add update triggers for timestamp management
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_timestamp
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pi_wallets_timestamp
    BEFORE UPDATE ON pi_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add row level security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_wallets ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY users_self_access ON users
    FOR ALL
    TO authenticated_users
    USING (id = current_user_id());

CREATE POLICY accounts_owner_access ON accounts
    FOR ALL
    TO authenticated_users
    USING (user_id = current_user_id());

CREATE POLICY transactions_participant_access ON transactions
    FOR ALL
    TO authenticated_users
    USING (
        source_account_id IN (SELECT id FROM accounts WHERE user_id = current_user_id())
        OR destination_account_id IN (SELECT id FROM accounts WHERE user_id = current_user_id())
    );

CREATE POLICY pi_wallets_owner_access ON pi_wallets
    FOR ALL
    TO authenticated_users
    USING (user_id = current_user_id());