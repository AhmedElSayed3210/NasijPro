
import pg from 'pg';
import bcrypt from 'bcryptjs';
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

async function verifyLogin() {
    console.log('Connecting to database:', config.database);
    const client = new pg.Client(config);

    try {
        await client.connect();

        // 1. Get user
        const res = await client.query("SELECT * FROM users WHERE username = 'admin'");
        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const user = res.rows[0];
        console.log('User found:', user.username);
        console.log('Hash:', user.password_hash);

        // 2. Compare hash directly
        const isMatch = await bcrypt.compare('admin123', user.password_hash);
        console.log('Direct bcrypt compare result:', isMatch);

        if (!isMatch) {
            console.log('CRITICAL: Hash does NOT match "admin123". Resetting...');
            // Force reset again here just in case?
        } else {
            console.log('Hash is valid.');
        }

        // 3. Test API
        console.log('Testing API...');
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });

            const data = await response.json();
            console.log('API Status:', response.status);
            if (response.ok) {
                console.log('API Login Successful:', data.message || 'OK');
            } else {
                console.log('API Login Failed:', data);
            }
        } catch (e) {
            console.error('API Error:', e.message);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

verifyLogin();
