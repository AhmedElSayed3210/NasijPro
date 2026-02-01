import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all employees
router.get('/', async (req, res) => {
    try {
        const showDeleted = req.query.showDeleted === 'true' && req.user.role === 'ADMIN';
        const result = await pool.query(`SELECT * FROM employees ${showDeleted ? '' : 'WHERE is_deleted = false'} ORDER BY name`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single employee
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees WHERE id = $1 AND (is_deleted = false OR $2 = true)', [req.params.id, req.user.role === 'ADMIN']);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create employee
router.post('/', async (req, res) => {
    try {
        const { name, monthly_salary, hire_date } = req.body;

        const result = await pool.query(
            'INSERT INTO employees (name, monthly_salary, hire_date) VALUES ($1, $2, $3) RETURNING *',
            [name, monthly_salary, hire_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, monthly_salary, hire_date, status } = req.body;

        const result = await pool.query(
            'UPDATE employees SET name = $1, monthly_salary = $2, hire_date = $3, status = $4 WHERE id = $5 AND is_deleted = false RETURNING *',
            [name, monthly_salary, hire_date, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found or is deleted' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SOFT DELETE employee
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE employees SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
            [req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found or already deleted' });
        }

        res.json({ message: 'Employee soft-deleted successfully', employee: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

import { isAdmin } from '../middleware/auth.js';
// RESTORE employee (Admin only)
router.post('/:id/restore', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE employees SET is_deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND is_deleted = true RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted employee not found' });
        }

        res.json({ message: 'Employee restored successfully', employee: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
