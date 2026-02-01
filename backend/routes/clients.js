import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all clients
router.get('/', async (req, res) => {
    try {
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';
        const result = await pool.query(`SELECT * FROM clients ${showDeleted ? '' : 'WHERE is_deleted = false'} ORDER BY name`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single client
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients WHERE id = $1 AND (is_deleted = false OR $2 = true)', [req.params.id, req.user.role === 'ADMIN']);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client balance (Manufacturing model)
router.get('/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;

        // Current model: Client owes based on production weight logs
        const prodResult = await pool.query(
            'SELECT COALESCE(SUM(total_amount), 0) as total FROM production_logs WHERE client_id = $1 AND is_deleted = false',
            [id]
        );
        const totalProduction = parseFloat(prodResult.rows[0].total) || 0;

        // Payments from client
        const incomeResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
             WHERE client_id = $1 AND transaction_type = 'INCOME' AND is_deleted = false`,
            [id]
        );
        const totalPayments = parseFloat(incomeResult.rows[0].total) || 0;

        const currentBalance = totalProduction - totalPayments;

        res.json({
            total_production: totalProduction,
            total_payments: totalPayments,
            current_balance: currentBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create client
router.post('/', async (req, res) => {
    try {
        const { name, phone } = req.body;
        const result = await pool.query(
            'INSERT INTO clients (name, phone) VALUES ($1, $2) RETURNING *',
            [name, phone]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update client
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;
        const result = await pool.query(
            'UPDATE clients SET name = $1, phone = $2 WHERE id = $3 AND is_deleted = false RETURNING *',
            [name, phone, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found or is deleted' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE client
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE clients SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found or already deleted' });
        }
        res.json({ message: 'Client soft-deleted successfully', client: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE client (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE clients SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted client not found' });
        }
        res.json({ message: 'Client restored successfully', client: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
