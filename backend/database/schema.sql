-- Textile Factory ERP Database Schema
-- PostgreSQL Database Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS machine_costs CASCADE;
DROP TABLE IF EXISTS machine_status_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS production_logs CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS operations CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS shareholders CASCADE;

-- 1. Shareholders Table (Owners of machines)
CREATE TABLE shareholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients Table (Manufacturing service customers)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Machines Table
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_number VARCHAR(50) UNIQUE NOT NULL,
  machine_type VARCHAR(100) NOT NULL,
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER')),
  shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL,
  factory_profit_percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (factory_profit_percentage >= 0 AND factory_profit_percentage <= 100.00),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STOPPED', 'MAINTENANCE')),
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Employees Table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  monthly_salary DECIMAL(15,2) NOT NULL,
  hire_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Operations Table
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(machine_id, operation_date)
);

-- 6. Maintenance Table
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(20) NOT NULL CHECK (maintenance_type IN ('ROUTINE', 'URGENT')),
  cost DECIMAL(15,2) NOT NULL,
  notes TEXT,
  next_due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Production Logs Table (Weight-based production billing)
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg' CHECK (unit IN ('kg', 'ton', 'piece')),
  unit_price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  log_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Machine Status Logs (For calculating uptime in reports)
CREATE TABLE machine_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'STOPPED', 'MAINTENANCE')),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Machine Specific Costs
CREATE TABLE machine_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('FIXED', 'VARIABLE')),
    billing_month DATE, -- Only for VARIABLE costs
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. User Permissions Table (Page-level access control)
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_name VARCHAR(100) NOT NULL,
    has_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, page_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_machines_owner_type ON machines(owner_type);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_operations_date ON operations(operation_date);
CREATE INDEX idx_operations_machine ON operations(machine_id);
CREATE INDEX idx_maintenance_date ON maintenance(maintenance_date);
CREATE INDEX idx_maintenance_machine ON maintenance(machine_id);
CREATE INDEX idx_production_date ON production_logs(log_date);
CREATE INDEX idx_production_machine ON production_logs(machine_id);
CREATE INDEX idx_production_client ON production_logs(client_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_status_logs_machine ON machine_status_logs(machine_id);
CREATE INDEX idx_status_logs_dates ON machine_status_logs(start_date, end_date);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);

-- Insert sample data
INSERT INTO shareholders (name, phone) VALUES 
  ('أحمد الشريك', '01011111111'),
  ('محمد الشريك', '01022222222');

INSERT INTO clients (name, phone, opening_balance) VALUES
  ('شركة النسيج المتحدة', '0501234567', 0),
  ('مصنع الأقمشة الحديثة', '0559876543', 5000);

INSERT INTO machines (machine_number, machine_type, owner_type, shareholder_id, start_date, factory_profit_percentage) VALUES
  ('M-001', 'آلة نسيج أوتوماتيكية', 'FACTORY', NULL, '2024-01-01', 100),
  ('M-002', 'آلة تطريز', 'FACTORY', NULL, '2024-01-01', 100),
  ('M-003', 'آلة نسيج صناعية', 'SHAREHOLDER', (SELECT id FROM shareholders WHERE name = 'أحمد الشريك'), '2024-02-01', 50),
  ('M-004', 'آلة قص وتفصيل', 'SHAREHOLDER', (SELECT id FROM shareholders WHERE name = 'محمد الشريك'), '2024-03-01', 60);

INSERT INTO employees (name, monthly_salary, hire_date) VALUES
  ('أحمد محمد', 3000, '2024-01-01'),
  ('فاطمة علي', 2800, '2024-02-15');

-- Add initial Admin user (Password: admin123)
-- Note: In production, this should be hashed through the migration script
INSERT INTO users (name, username, password_hash, role, status) VALUES
  ('مدير النظام', 'admin', '$2a$10$X8Hn8pMv0D9o.f9J7Z0yU.wY3zP9v6.0wP8y5P9v6.0wP8y5P9v6.', 'ADMIN', 'ACTIVE');

-- Comments
COMMENT ON TABLE shareholders IS 'Machine owners who share profits with the factory';
COMMENT ON TABLE clients IS 'Manufacturing service customers who pay for production';
COMMENT ON TABLE machines IS 'Machine registry with ownership and profit sharing ratios';
COMMENT ON TABLE employees IS 'Factory staff and their monthly salaries';
COMMENT ON TABLE operations IS 'Daily machine working hour logs';
COMMENT ON TABLE maintenance IS 'Machine maintenance records';
COMMENT ON TABLE production_logs IS 'Weight-based production records for manufacturing clients';
COMMENT ON TABLE transactions IS 'General financial transactions including client income and shareholder payouts';
COMMENT ON TABLE machine_status_logs IS 'History of machine status changes for uptime calculation';
COMMENT ON TABLE machine_costs IS 'Specific machine overhead costs (fixed or variable)';
COMMENT ON TABLE users IS 'Authorized system users and status management';
COMMENT ON TABLE user_permissions IS 'Granular page-level permissions for employees';
