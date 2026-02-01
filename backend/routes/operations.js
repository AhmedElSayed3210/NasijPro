import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all operations
router.get('/', async (req, res) => {
    try {
        const { machine_id, start_date, end_date } = req.query;
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';

        let query = `
            SELECT o.*, m.machine_number, m.machine_type 
            FROM operations o
            LEFT JOIN machines m ON o.machine_id = m.id
            WHERE ${showDeleted ? '1=1' : 'o.is_deleted = false'}
        `;
        const params = [];

        if (machine_id) {
            params.push(machine_id);
            query += ` AND o.machine_id = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND o.operation_date >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND o.operation_date <= $${params.length}`;
        }

        query += ' ORDER BY o.operation_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create operation
router.post('/', async (req, res) => {
    try {
        const { machine_id, operation_date, hours_worked, notes } = req.body;

        const result = await pool.query(
            'INSERT INTO operations (machine_id, operation_date, hours_worked, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [machine_id, operation_date, hours_worked, notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({ error: 'Operation already exists for this machine on this date' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT update operation
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { machine_id, operation_date, hours_worked, notes } = req.body;

        const result = await pool.query(
            'UPDATE operations SET machine_id = $1, operation_date = $2, hours_worked = $3, notes = $4 WHERE id = $5 AND is_deleted = false RETURNING *',
            [machine_id, operation_date, hours_worked, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Operation not found or is deleted' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE operation
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE operations SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Operation not found or already deleted' });
        }

        res.json({ message: 'Operation soft-deleted successfully', operation: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE operation (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE operations SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted operation not found' });
        }

        res.json({ message: 'Operation restored successfully', operation: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
