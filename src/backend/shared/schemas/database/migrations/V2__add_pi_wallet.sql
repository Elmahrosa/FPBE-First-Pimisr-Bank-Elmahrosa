-- Create custom types for wallet and transaction status tracking
CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'LOCKED', 'SUSPENDED');
CREATE TYPE transaction_type AS ENUM ('MINING', 'TRANSFER', 'EXCHANGE', 'REWARD');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Create function for updating timestamps automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pi_wallets table for storing wallet information
CREATE TABLE pi_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    balance DECIMAL(19,8) NOT NULL DEFAULT 0,
    last_mined TIMESTAMP,
    mining_rate DECIMAL(10,8) DEFAULT 0.25,
    total_mined DECIMAL(19,8) DEFAULT 0,
    status wallet_status NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_balance CHECK (balance >= 0),
    CONSTRAINT unique_user_wallet UNIQUE (user_id) WHERE status = 'ACTIVE'
);

-- Create indexes for pi_wallets table
CREATE INDEX idx_pi_wallets_user ON pi_wallets(user_id);
CREATE INDEX idx_pi_wallets_address ON pi_wallets(wallet_address);
CREATE INDEX idx_pi_wallets_status ON pi_wallets(status);
CREATE INDEX idx_pi_wallets_mining ON pi_wallets(last_mined) WHERE status = 'ACTIVE';

-- Create pi_transactions table for storing transaction history
CREATE TABLE pi_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES pi_wallets(id),
    type transaction_type NOT NULL,
    amount DECIMAL(19,8) NOT NULL,
    fee DECIMAL(19,8) DEFAULT 0,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    status transaction_status NOT NULL DEFAULT 'PENDING',
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_amount CHECK (amount > 0),
    CONSTRAINT check_positive_fee CHECK (fee >= 0),
    CONSTRAINT validate_addresses CHECK (from_address != to_address)
);

-- Create indexes for pi_transactions table
CREATE INDEX idx_pi_transactions_wallet ON pi_transactions(wallet_id);
CREATE INDEX idx_pi_transactions_type ON pi_transactions(type);
CREATE INDEX idx_pi_transactions_status ON pi_transactions(status);
CREATE INDEX idx_pi_transactions_created ON pi_transactions(created_at);
CREATE INDEX idx_pi_transactions_block ON pi_transactions(block_number) WHERE status = 'COMPLETED';
CREATE INDEX idx_pi_transactions_addresses ON pi_transactions(from_address, to_address);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pi_wallets_timestamp
    BEFORE UPDATE ON pi_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_pi_transactions_timestamp
    BEFORE UPDATE ON pi_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create trigger for transaction audit logging
CREATE OR REPLACE FUNCTION audit_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs(
        table_name,
        record_id,
        action,
        old_data,
        new_data
    ) VALUES (
        'pi_transactions',
        NEW.id,
        TG_OP,
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_pi_transactions
    AFTER INSERT OR UPDATE ON pi_transactions
    FOR EACH ROW
    EXECUTE FUNCTION audit_transaction();

-- Add comments for documentation
COMMENT ON TABLE pi_wallets IS 'Stores Pi Network wallet information for users';
COMMENT ON TABLE pi_transactions IS 'Records all Pi Network transactions';
COMMENT ON COLUMN pi_wallets.mining_rate IS 'Current mining rate in Pi per hour';
COMMENT ON COLUMN pi_transactions.block_number IS 'Block number where transaction was confirmed';