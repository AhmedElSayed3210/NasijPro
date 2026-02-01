import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all production logs
router.get('/', async (req, res) => {
    try {
        const { machine_id, client_id, start_date, end_date } = req.query;
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';

        let query = `
            SELECT p.*, m.machine_number, c.name as client_name 
            FROM production_logs p
            LEFT JOIN machines m ON p.machine_id = m.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE ${showDeleted ? '1=1' : 'p.is_deleted = false'}
        `;
        const params = [];

        if (machine_id) {
            params.push(machine_id);
            query += ` AND p.machine_id = $${params.length}`;
        }

        if (client_id) {
            params.push(client_id);
            query += ` AND p.client_id = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND p.log_date >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND p.log_date <= $${params.length}`;
        }

        query += ' ORDER BY p.log_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create production log
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { machine_id, client_id, product_name, quantity, unit, unit_price, log_date, notes } = req.body;

        const result = await client.query(
            `INSERT INTO production_logs (machine_id, client_id, product_name, quantity, unit, unit_price, log_date, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [machine_id, client_id || null, product_name, quantity, unit || 'kg', unit_price, log_date, notes]
        );

        const newLog = result.rows[0];

        // Automatically create income transaction (Factory operational income) and link via source_id
        await client.query(
            `INSERT INTO transactions (transaction_type, category, amount, transaction_date, client_id, machine_id, description, source_id)
             VALUES ('INCOME', 'Production', $1, $2, $3, $4, $5, $6)`,
            [newLog.total_amount, log_date, client_id || null, machine_id, `أعمال إنتاج: ${product_name} (${quantity} ${unit || 'kg'})`, newLog.id]
        );

        await client.query('COMMIT');
        res.status(201).json(newLog);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// SOFT DELETE production log
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const result = await client.query(
            'UPDATE production_logs SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Log not found or already deleted' });
        }

        // Soft delete linked transaction
        await client.query(
            'UPDATE transactions SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE source_id = $2',
            [req.user.id, id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Production log and linked transaction soft-deleted successfully', log: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE production log (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const result = await client.query(
            'UPDATE production_logs SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deleted log not found' });
        }

        // Restore linked transaction
        await client.query(
            'UPDATE transactions SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE source_id = $1',
            [id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Production log and linked transaction restored successfully', log: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
