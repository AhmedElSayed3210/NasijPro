import pool from '../config/database.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Restructuring for Shareholders and Manufacturing Clients...');
        await client.query('BEGIN');

        // 1. Create Shareholders table
        console.log('Creating shareholders table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS shareholders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                phone VARCHAR(50),
                opening_balance DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Rename Customers to Clients
        console.log('Renaming customers to clients...');
        await client.query('ALTER TABLE customers RENAME TO clients;');

        // 3. Update Machines table
        console.log('Updating machines table...');
        // Drop old check and rename
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_owner_type_check;');
        await client.query("ALTER TABLE machines ADD CONSTRAINT machines_owner_type_check CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER'));");

        // Handle shareholder_id migration (map existing CLIENT owner_type to SHAREHOLDER)
        await client.query("UPDATE machines SET owner_type = 'SHAREHOLDER' WHERE owner_type = 'CLIENT';");

        // Rename column customer_id to shareholder_id
        await client.query('ALTER TABLE machines RENAME COLUMN customer_id TO shareholder_id;');
        // Rename FK constraint if possible, or just drop and recreate
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_customer_id_fkey;');
        await client.query('ALTER TABLE machines ADD CONSTRAINT machines_shareholder_id_fkey FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE SET NULL;');

        // 4. Update Production Logs (Renamed from Sales)
        console.log('Renaming sales to production_logs...');
        await client.query('ALTER TABLE sales RENAME TO production_logs;');
        await client.query('ALTER TABLE production_logs RENAME COLUMN customer_id TO client_id;');
        await client.query('ALTER TABLE production_logs RENAME COLUMN sale_date TO log_date;');
        await client.query("ALTER TABLE production_logs ADD COLUMN unit VARCHAR(10) DEFAULT 'kg' CHECK (unit IN ('kg', 'ton'));");

        // Update FK for client_id
        await client.query('ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;');
        await client.query('ALTER TABLE production_logs ADD CONSTRAINT production_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');

        // 5. Update Transactions table
        console.log('Updating transactions table...');
        await client.query('ALTER TABLE transactions RENAME COLUMN customer_id TO client_id;');
        await client.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;');
        await client.query('ALTER TABLE transactions ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');

        // Add shareholder_id to transactions for payouts
        await client.query('ALTER TABLE transactions ADD COLUMN shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL;');

        await client.query('COMMIT');
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

migrate();
