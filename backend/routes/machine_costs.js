import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all costs for a machine
router.get('/machine/:machineId', async (req, res) => {
    try {
        const { machineId } = req.params;
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';
        const result = await pool.query(
            `SELECT * FROM machine_costs WHERE machine_id = $1 ${showDeleted ? '' : 'AND is_deleted = false'} ORDER BY created_at DESC`,
            [machineId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET variable costs for a machine in a specific month
router.get('/machine/:machineId/variable/:year/:month', async (req, res) => {
    try {
        const { machineId, year, month } = req.params;
        const result = await pool.query(
            `SELECT * FROM machine_costs 
             WHERE machine_id = $1 
             AND cost_type = 'VARIABLE'
             AND EXTRACT(YEAR FROM billing_month) = $2
             AND EXTRACT(MONTH FROM billing_month) = $3
             AND is_deleted = false`,
            [machineId, year, month]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add new cost
router.post('/', async (req, res) => {
    try {
        const { machine_id, cost_type, category, amount, billing_month, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO machine_costs (machine_id, cost_type, category, amount, billing_month, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_id, cost_type, category, amount, billing_month || null, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update cost
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { category, amount, billing_month, notes } = req.body;
        const result = await pool.query(
            `UPDATE machine_costs 
             SET category = $1, amount = $2, billing_month = $3, notes = $4
             WHERE id = $5 AND is_deleted = false RETURNING *`,
            [category, amount, billing_month || null, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cost record not found or is deleted' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE cost
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE machine_costs SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cost record not found or already deleted' });
        }
        res.json({ message: 'Cost record soft-deleted successfully', cost: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE cost (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE machine_costs SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted cost record not found' });
        }
        res.json({ message: 'Cost record restored successfully', cost: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
