import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all shareholders
router.get('/', async (req, res) => {
    try {
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';
        const result = await pool.query(`SELECT * FROM shareholders ${showDeleted ? '' : 'WHERE is_deleted = false'} ORDER BY name`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single shareholder
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM shareholders WHERE id = $1 AND (is_deleted = false OR $2 = true)', [req.params.id, req.user.role === 'ADMIN']);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shareholder not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET shareholder performance/payouts
router.get('/:id/payouts', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM transactions 
             WHERE shareholder_id = $1 AND transaction_type = 'EXPENSE' AND category = 'Payout' AND is_deleted = false
             ORDER BY transaction_date DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create shareholder
router.post('/', async (req, res) => {
    try {
        const { name, phone, opening_balance } = req.body;
        const result = await pool.query(
            'INSERT INTO shareholders (name, phone, opening_balance) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, opening_balance || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update shareholder
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, opening_balance } = req.body;
        const result = await pool.query(
            'UPDATE shareholders SET name = $1, phone = $2, opening_balance = $3 WHERE id = $4 AND is_deleted = false RETURNING *',
            [name, phone, opening_balance, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shareholder not found or is deleted' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE shareholder
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE shareholders SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shareholder not found or already deleted' });
        }
        res.json({ message: 'Shareholder soft-deleted successfully', shareholder: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE shareholder (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE shareholders SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted shareholder not found' });
        }
        res.json({ message: 'Shareholder restored successfully', shareholder: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
