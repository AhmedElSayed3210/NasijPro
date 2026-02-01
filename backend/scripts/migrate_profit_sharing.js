import pool from '../config/database.js';

async function migrate() {
    try {
        console.log('Starting migration: adding factory_profit_percentage to machines table...');
        await pool.query(`
            ALTER TABLE machines 
            ADD COLUMN IF NOT EXISTS factory_profit_percentage DECIMAL(5,2) DEFAULT 100.00 
            CHECK (factory_profit_percentage >= 0 AND factory_profit_percentage <= 100.00);
        `);
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
