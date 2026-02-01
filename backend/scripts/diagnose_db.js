import pool from '../config/database.js';

async function diagnose() {
    const client = await pool.connect();
    try {
        console.log('Fetching constraints for machines table...');
        const res = await client.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'machines'::regclass;
        `);
        console.log('Constraints on machines:', res.rows.map(r => r.conname));

        console.log('Fetching tables...');
        const tables = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public';
        `);
        console.log('Existing tables:', tables.rows.map(r => r.tablename));

        process.exit(0);
    } catch (error) {
        console.error('Diagnosis failed:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

diagnose();
