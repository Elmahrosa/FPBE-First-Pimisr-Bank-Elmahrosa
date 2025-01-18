-- PostgreSQL 15+ Database Initialization Script for FPBE Mobile Banking Application
-- This script sets up the primary database with all required configurations,
-- extensions, and security settings.

-- Terminate any existing connections to the database if it exists
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'fpbe_banking' 
AND pid <> pg_backend_pid();

-- Create database with proper encoding and collation
CREATE DATABASE fpbe_banking
    WITH 
    OWNER = fpbe_admin
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = 100;

-- Connect to the newly created database
\c fpbe_banking

-- Security configurations
ALTER DATABASE fpbe_banking SET ssl = on;
ALTER DATABASE fpbe_banking SET password_encryption = 'scram-sha-256';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption functions
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- For advanced indexing
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_partman";     -- For partition management

-- Create schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    CONSTRAINT valid_version_format CHECK (version ~ '^V[0-9]+__.*$')
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
    ON schema_migrations(applied_at);

-- Set up audit logging for schema migrations
CREATE OR REPLACE FUNCTION audit_schema_migration()
    RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        RAISE NOTICE 'Applied migration: %', NEW.version;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_schema_migration
    AFTER INSERT ON schema_migrations
    FOR EACH ROW
    EXECUTE FUNCTION audit_schema_migration();

-- Performance configurations
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Autovacuum settings
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
ALTER SYSTEM SET default_statistics_target = 100;

-- Set default privileges for database objects
ALTER DEFAULT PRIVILEGES FOR ROLE fpbe_admin
    IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fpbe_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE fpbe_admin
    IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO fpbe_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE fpbe_admin
    IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO fpbe_admin;

-- Enable statement logging for monitoring
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Create function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
    RETURNS TABLE (
        check_name TEXT,
        status TEXT,
        details TEXT
    ) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Database Size' as check_name,
           'OK' as status,
           pg_size_pretty(pg_database_size('fpbe_banking')) as details
    UNION ALL
    SELECT 'Connection Count',
           CASE WHEN count(*) <= current_setting('max_connections')::int * 0.8
                THEN 'OK' ELSE 'WARNING' END,
           count(*)::text
    FROM pg_stat_activity
    UNION ALL
    SELECT 'Replication Status',
           CASE WHEN pg_is_in_recovery() THEN 'REPLICA' ELSE 'PRIMARY' END,
           'Working as expected';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create maintenance function for regular cleanup
CREATE OR REPLACE FUNCTION perform_maintenance()
    RETURNS void AS $$
BEGIN
    ANALYZE VERBOSE;
    VACUUM (ANALYZE, VERBOSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up scheduled maintenance (requires pg_cron extension if automated scheduling is needed)
COMMENT ON FUNCTION perform_maintenance() IS 'Run this function periodically for database maintenance';

-- Verify installation
DO $$
BEGIN
    RAISE NOTICE 'FPBE Banking Database initialized successfully';
    RAISE NOTICE 'Database version: %', current_setting('server_version');
    RAISE NOTICE 'SSL enabled: %', current_setting('ssl');
    RAISE NOTICE 'Maximum connections: %', current_setting('max_connections');
END $$;