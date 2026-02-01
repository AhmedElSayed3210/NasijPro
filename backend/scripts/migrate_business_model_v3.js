import pool from '../config/database.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Data-aware restructuring...');
        await client.query('BEGIN');

        // 1. Create Shareholders table
        await client.query(`
            CREATE TABLE IF NOT EXISTS shareholders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                phone VARCHAR(50),
                opening_balance DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Rename Customers to Clients safely
        const tableCheck = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'clients';");
        if (tableCheck.rows.length === 0) {
            await client.query('ALTER TABLE customers RENAME TO clients;');
        }

        // 3. Move machine owners from clients to shareholders
        console.log('Moving owners to shareholders table...');
        const owners = await client.query(`
            INSERT INTO shareholders (name, phone, opening_balance)
            SELECT name, phone, opening_balance FROM clients
            WHERE id IN (SELECT customer_id FROM machines WHERE customer_id IS NOT NULL)
            RETURNING id, name;
        `);
        console.log(`Moved ${owners.rows.length} owners.`);

        // 4. Update Machines table
        console.log('Updating machines table structure...');
        await client.query("ALTER TABLE machines ADD COLUMN IF NOT EXISTS shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL;");

        // Map old customer_id to new shareholder_id based on name match (simplest since we just moved them)
        await client.query(`
            UPDATE machines m
            SET shareholder_id = s.id
            FROM shareholders s, clients c
            WHERE m.customer_id = c.id AND c.name = s.name;
        `);

        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_owner_type_check;');
        await client.query("ALTER TABLE machines ADD CONSTRAINT machines_owner_type_check CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER', 'CLIENT'));");
        await client.query("UPDATE machines SET owner_type = 'SHAREHOLDER' WHERE owner_type = 'CLIENT' OR owner_type = 'SHAREHOLDER';");
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_owner_type_check;');
        await client.query("ALTER TABLE machines ADD CONSTRAINT machines_owner_type_check CHECK (owner_type IN ('FACTORY', 'SHAREHOLDER'));");

        // Clean up old column
        // We might want to keep it if we are not sure, but for this migration we drop it.
        // But first drop the FK.
        await client.query('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_customer_id_fkey;');
        await client.query('ALTER TABLE machines DROP COLUMN IF EXISTS customer_id;');

        // 5. Update Production Logs (Formerly Sales)
        console.log('Renaming sales to production_logs...');
        const salesCheck = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'sales';");
        if (salesCheck.rows.length > 0) {
            await client.query('ALTER TABLE sales RENAME TO production_logs;');
            await client.query('ALTER TABLE production_logs RENAME COLUMN customer_id TO client_id;');
            await client.query('ALTER TABLE production_logs RENAME COLUMN sale_date TO log_date;');
            await client.query("ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'kg' CHECK (unit IN ('kg', 'ton'));");

            await client.query('ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;');
            await client.query('ALTER TABLE production_logs ADD CONSTRAINT production_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');
        }

        // 6. Update Transactions
        console.log('Updating transactions table...');
        const transColCheck = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'client_id';");
        if (transColCheck.rows.length === 0) {
            await client.query('ALTER TABLE transactions RENAME COLUMN customer_id TO client_id;');
        }
        await client.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;');
        await client.query('ALTER TABLE transactions ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;');
        await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shareholder_id UUID REFERENCES shareholders(id) ON DELETE SET NULL;');

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
