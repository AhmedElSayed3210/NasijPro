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
        // Check if clients exists first to avoid double rename
        const tableCheck = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'clients';");
        if (tableCheck.rows.length === 0) {
            await client.query('ALTER TABLE customers RENAME TO clients;');
        }

        // 3. Update Machines table
        console.log('Updating machines table...');
        // Drop old check - try multiple common names just in case
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_owner_type_check;');
        await client.query("ALTER TABLE machines ADD CONSTRAINT machines_owner_type_check CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER', 'CLIENT'));");

        // Handle shareholder_id migration (map existing CLIENT owner_type to SHAREHOLDER)
        await client.query("UPDATE machines SET owner_type = 'SHAREHOLDER' WHERE owner_type = 'CLIENT';");

        // Finalize check constraint
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_owner_type_check;');
        await client.query("ALTER TABLE machines ADD CONSTRAINT machines_owner_type_check CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER'));");

        // Check if shareholder_id already exists (idempotency)
        const colCheck = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'shareholder_id';");
        if (colCheck.rows.length === 0) {
            await client.query('ALTER TABLE machines RENAME COLUMN customer_id TO shareholder_id;');
        }

        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_customer_id_fkey;');
        await client.query('ALTER TABLE machines ADD CONSTRAINT machines_shareholder_id_fkey FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE SET NULL;');

        // 4. Update Production Logs (Renamed from Sales)
        console.log('Renaming sales to production_logs...');
        const salesCheck = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'sales';");
        if (salesCheck.rows.length > 0) {
            await client.query('ALTER TABLE sales RENAME TO production_logs;');
        }

        const logColCheckBalance = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'production_logs' AND column_name = 'client_id';");
        if (logColCheckBalance.rows.length === 0) {
            await client.query('ALTER TABLE production_logs RENAME COLUMN customer_id TO client_id;');
        }

        const logColCheckDate = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'production_logs' AND column_name = 'log_date';");
        if (logColCheckDate.rows.length === 0) {
            await client.query('ALTER TABLE production_logs RENAME COLUMN sale_date TO log_date;');
        }

        const unitCheck = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'production_logs' AND column_name = 'unit';");
        if (unitCheck.rows.length === 0) {
            await client.query("ALTER TABLE production_logs ADD COLUMN unit VARCHAR(10) DEFAULT 'kg' CHECK (unit IN ('kg', 'ton'));");
        }

        await client.query('ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;');
        await client.query('ALTER TABLE production_logs ADD CONSTRAINT production_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');

        // 5. Update Transactions table
        console.log('Updating transactions table...');
        const transColCheck = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'client_id';");
        if (transColCheck.rows.length === 0) {
            await client.query('ALTER TABLE transactions RENAME COLUMN customer_id TO client_id;');
        }
        await client.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;');
        await client.query('ALTER TABLE transactions ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');

        const shareCheckTrans = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'shareholder_id';");
        if (shareCheckTrans.rows.length === 0) {
            await client.query('ALTER TABLE transactions ADD COLUMN shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL;');
        }

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
