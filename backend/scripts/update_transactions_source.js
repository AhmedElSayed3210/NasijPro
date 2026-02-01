import pool from '../config/database.js';

async function updateTransactionsTable() {
    const client = await pool.connect();
    try {
        console.log('Updating transactions table to include source_id...');
        await client.query('BEGIN');

        await client.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS source_id UUID NULL
        `);

        await client.query('COMMIT');
        console.log('✅ Transactions table updated successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Update failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

updateTransactionsTable();
