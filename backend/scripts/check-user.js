
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env vars
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'textile_erp',
};

async function checkUser() {
    console.log('Connecting to database:', config.database);
    const client = new pg.Client(config);

    try {
        await client.connect();

        // Select user
        const res = await client.query("SELECT id, username, password_hash, role, status FROM users WHERE username = 'admin'");

        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User "admin" not found!');
        }

    } catch (err) {
        console.error('Error checking user:', err);
    } finally {
        await client.end();
    }
}

checkUser();
