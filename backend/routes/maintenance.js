import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all maintenance records
router.get('/', async (req, res) => {
    try {
        const { machine_id } = req.query;
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';

        let query = `
            SELECT m.*, ma.machine_number, ma.machine_type 
            FROM maintenance m
            LEFT JOIN machines ma ON m.machine_id = ma.id
            WHERE ${showDeleted ? '1=1' : 'm.is_deleted = false'}
        `;
        const params = [];

        if (machine_id) {
            params.push(machine_id);
            query += ` AND m.machine_id = $${params.length}`;
        }

        query += ' ORDER BY m.maintenance_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create maintenance record
router.post('/', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { machine_id, maintenance_date, maintenance_type, cost, notes, next_due_date } = req.body;

        // 1. Insert maintenance record
        const maintenanceResult = await client.query(
            `INSERT INTO maintenance (machine_id, maintenance_date, maintenance_type, cost, notes, next_due_date) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_id, maintenance_date, maintenance_type, cost, notes, next_due_date]
        );
        const maintenanceRecord = maintenanceResult.rows[0];

        // 2. Automatically create expense transaction and link via source_id
        await client.query(
            `INSERT INTO transactions (transaction_type, category, amount, transaction_date, machine_id, description, source_id)
             VALUES ('EXPENSE', 'Maintenance', $1, $2, $3, $4, $5)`,
            [cost, maintenance_date, machine_id, `${maintenance_type} maintenance - ${notes || ''}`, maintenanceRecord.id]
        );

        await client.query('COMMIT');
        res.status(201).json(maintenanceRecord);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PUT update maintenance
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { machine_id, maintenance_date, maintenance_type, cost, notes, next_due_date } = req.body;

        const result = await client.query(
            `UPDATE maintenance 
             SET machine_id = $1, maintenance_date = $2, maintenance_type = $3, 
                 cost = $4, notes = $5, next_due_date = $6
             WHERE id = $7 AND is_deleted = false RETURNING *`,
            [machine_id, maintenance_date, maintenance_type, cost, notes, next_due_date, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Maintenance record not found or is deleted' });
        }

        // Update linked transaction
        await client.query(
            `UPDATE transactions 
             SET amount = $1, transaction_date = $2, machine_id = $3, description = $4
             WHERE source_id = $5 AND category = 'Maintenance'`,
            [cost, maintenance_date, machine_id, `${maintenance_type} maintenance - ${notes || ''}`, id]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// SOFT DELETE maintenance
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const result = await client.query(
            'UPDATE maintenance SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Maintenance record not found or already deleted' });
        }

        // Soft delete linked transaction
        await client.query(
            'UPDATE transactions SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE source_id = $2',
            [req.user.id, id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Maintenance record and linked transaction soft-deleted successfully', maintenance: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE maintenance (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const result = await client.query(
            'UPDATE maintenance SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deleted maintenance record not found' });
        }

        // Restore linked transaction
        await client.query(
            'UPDATE transactions SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE source_id = $1',
            [id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Maintenance record and linked transaction restored successfully', maintenance: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
