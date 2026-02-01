import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all machines
router.get('/', async (req, res) => {
    try {
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';
        const query = `
            SELECT m.*, s.name as shareholder_name 
            FROM machines m
            LEFT JOIN shareholders s ON m.shareholder_id = s.id
            ${showDeleted ? '' : 'WHERE m.is_deleted = false'}
            ORDER BY m.machine_number
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single machine
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT m.*, s.name as shareholder_name FROM machines m LEFT JOIN shareholders s ON m.shareholder_id = s.id WHERE m.id = $1 AND (m.is_deleted = false OR $2 = true)',
            [req.params.id, req.user.role === 'ADMIN']
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET machine history
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;

        const [operations, maintenance, sales] = await Promise.all([
            pool.query('SELECT * FROM operations WHERE machine_id = $1 ORDER BY operation_date DESC', [id]),
            pool.query('SELECT * FROM maintenance WHERE machine_id = $1 ORDER BY maintenance_date DESC', [id]),
            pool.query('SELECT * FROM sales WHERE machine_id = $1 ORDER BY sale_date DESC', [id])
        ]);

        res.json({
            operations: operations.rows,
            maintenance: maintenance.rows,
            sales: sales.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create machine
router.post('/', async (req, res) => {
    try {
        const { machine_number, machine_type, owner_type, shareholder_id, start_date, factory_profit_percentage } = req.body;

        const result = await pool.query(
            `INSERT INTO machines (machine_number, machine_type, owner_type, shareholder_id, start_date, factory_profit_percentage) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [machine_number, machine_type, owner_type, owner_type === 'FACTORY' ? null : shareholder_id || null, start_date, owner_type === 'FACTORY' ? 100 : factory_profit_percentage || 50]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update machine
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { machine_number, machine_type, owner_type, shareholder_id, status, start_date, factory_profit_percentage } = req.body;

        const result = await pool.query(
            `UPDATE machines 
             SET machine_number = $1, machine_type = $2, owner_type = $3, 
                 shareholder_id = $4, status = $5, start_date = $6, factory_profit_percentage = $7
             WHERE id = $8 RETURNING *`,
            [machine_number, machine_type, owner_type, owner_type === 'FACTORY' ? null : shareholder_id || null, status, start_date, owner_type === 'FACTORY' ? 100 : factory_profit_percentage, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE machine
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE machines SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found or already deleted' });
        }

        res.json({ message: 'Machine soft-deleted successfully', machine: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE machine (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE machines SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted machine not found' });
        }

        res.json({ message: 'Machine restored successfully', machine: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST change machine status
router.post('/:id/status', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { status } = req.body;

        // 1. Close the previous log entry if it exists
        await client.query(
            `UPDATE machine_status_logs 
             SET end_date = CURRENT_TIMESTAMP 
             WHERE machine_id = $1 AND end_date IS NULL`,
            [id]
        );

        // 2. Insert the new log entry
        await client.query(
            `INSERT INTO machine_status_logs (machine_id, status) VALUES ($1, $2)`,
            [id, status]
        );

        // 3. Update the machine's current status
        const result = await client.query(
            `UPDATE machines SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Machine not found' });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET machine status logs
router.get('/:id/status-logs', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM machine_status_logs 
             WHERE machine_id = $1 
             ORDER BY start_date DESC LIMIT 50`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
