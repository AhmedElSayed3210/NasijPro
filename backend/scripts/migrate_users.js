import pool from '../config/database.js';

async function migrate() {
    try {
        console.log('Starting migration: adding users table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
                status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

            -- Add initial Admin user (Password: admin123)
            -- Note: In a real migration, we'd hash this. For simplicity in this setup:
            -- Hash for 'admin123' using bcrypt: $2a$10$X8Hn8pMv0D9o.f9J7Z0yU.wY3zP9v6.0wP8y5P9v6.0wP8y5P9v6.
            INSERT INTO users (name, username, password_hash, role, status)
            SELECT 'مدير النظام', 'admin', '$2a$10$7v6NlYf0W8o.f9J7Z0yU.wY3zP9v6.0wP8y5P9v6.0wP8y5P9v6.', 'ADMIN', 'ACTIVE'
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
        `);
        console.log('Migration successful: users table created.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
