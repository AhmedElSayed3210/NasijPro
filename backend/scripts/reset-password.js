
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

async function resetAdminPassword() {
    console.log('Connecting to database:', config.database);
    const client = new pg.Client(config);

    try {
        await client.connect();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        console.log('Generated hash for "admin123":', hashedPassword);

        const res = await client.query(
            `UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING *`,
            [hashedPassword]
        );

        if (res.rowCount > 0) {
            console.log('Admin password updated successfully.');
            console.log('Updated user:', res.rows[0].username);
        } else {
            console.log('Admin user not found. Creating one...');
            await client.query(
                `INSERT INTO users (name, username, password_hash, role, status) VALUES
            ('System Admin', 'admin', $1, 'ADMIN', 'ACTIVE')`,
                [hashedPassword]
            );
            console.log('Admin user created successfully.');
        }

    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await client.end();
    }
}

resetAdminPassword();
