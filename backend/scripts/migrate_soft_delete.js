import pool from '../config/database.js';

const tables = [
    'machines',
    'shareholders',
    'clients',
    'employees',
    'production_logs',
    'maintenance',
    'transactions',
    'machine_costs',
    'operations',
    'machine_status_logs'
];

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting soft delete migration...');
        await client.query('BEGIN');

        for (const table of tables) {
            console.log(`Updating table: ${table}`);

            // Add is_deleted column
            await client.query(`
                ALTER TABLE ${table} 
                ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
            `);

            // Add deleted_at column
            await client.query(`
                ALTER TABLE ${table} 
                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
            `);

            // Add deleted_by column
            await client.query(`
                ALTER TABLE ${table} 
                ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
            `);
        }

        await client.query('COMMIT');
        console.log('✅ Soft delete migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
