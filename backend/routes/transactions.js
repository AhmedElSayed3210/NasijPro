import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all transactions
router.get('/', async (req, res) => {
    try {
        const { transaction_type, category, start_date, end_date, client_id, shareholder_id, machine_id } = req.query;
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';

        let query = `
            SELECT t.*, c.name as client_name, s.name as shareholder_name, m.machine_number 
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN shareholders s ON t.shareholder_id = s.id
            LEFT JOIN machines m ON t.machine_id = m.id
            WHERE ${showDeleted ? '1=1' : 't.is_deleted = false'}
        `;
        const params = [];

        if (transaction_type) {
            params.push(transaction_type);
            query += ` AND t.transaction_type = $${params.length}`;
        }

        if (category) {
            params.push(category);
            query += ` AND t.category = $${params.length}`;
        }

        if (client_id) {
            params.push(client_id);
            query += ` AND t.client_id = $${params.length}`;
        }

        if (shareholder_id) {
            params.push(shareholder_id);
            query += ` AND t.shareholder_id = $${params.length}`;
        }

        if (machine_id) {
            params.push(machine_id);
            query += ` AND t.machine_id = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND t.transaction_date >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND t.transaction_date <= $${params.length}`;
        }

        query += ' ORDER BY t.transaction_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create transaction
router.post('/', async (req, res) => {
    try {
        const { transaction_type, category, amount, transaction_date, client_id, shareholder_id, machine_id, description } = req.body;

        const result = await pool.query(
            `INSERT INTO transactions (transaction_type, category, amount, transaction_date, client_id, shareholder_id, machine_id, description) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [transaction_type, category, amount, transaction_date, client_id || null, shareholder_id || null, machine_id || null, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update transaction
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { transaction_type, category, amount, transaction_date, client_id, shareholder_id, machine_id, description } = req.body;

        const result = await pool.query(
            `UPDATE transactions 
             SET transaction_type = $1, category = $2, amount = $3, 
                 transaction_date = $4, client_id = $5, shareholder_id = $6, machine_id = $7, description = $8
             WHERE id = $9 AND is_deleted = false RETURNING *`,
            [transaction_type, category, amount, transaction_date, client_id || null, shareholder_id || null, machine_id || null, description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or is deleted' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE transaction
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE transactions SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or already deleted' });
        }

        res.json({ message: 'Transaction soft-deleted successfully', transaction: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE transaction (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE transactions SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted transaction not found' });
        }

        res.json({ message: 'Transaction restored successfully', transaction: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
