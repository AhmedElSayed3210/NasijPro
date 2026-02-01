import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

async function updateAdmin() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        console.log('New Hash:', hash);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
        console.log('Admin password updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update admin password:', error);
        process.exit(1);
    }
}

updateAdmin();
