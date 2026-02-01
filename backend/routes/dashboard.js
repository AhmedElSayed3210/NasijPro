import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET dashboard summary
router.get('/summary', async (req, res) => {
    try {
        // Get active machines count
        const machinesResult = await pool.query(
            `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
              COUNT(*) FILTER (WHERE status = 'STOPPED') as stopped,
              COUNT(*) FILTER (WHERE status = 'MAINTENANCE') as maintenance
       FROM machines
       WHERE is_deleted = false`
        );

        // Get current month's income from production
        const incomeResult = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) as total 
             FROM production_logs 
             WHERE EXTRACT(YEAR FROM log_date) = EXTRACT(YEAR FROM CURRENT_DATE)
               AND EXTRACT(MONTH FROM log_date) = EXTRACT(MONTH FROM CURRENT_DATE)
               AND is_deleted = false`
        );

        // Get current month's expenses
        const expensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE transaction_type = 'EXPENSE'
         AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
         AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND is_deleted = false`
        );

        // Add monthly salaries to expenses
        const salariesResult = await pool.query(
            `SELECT COALESCE(SUM(monthly_salary), 0) as total 
       FROM employees WHERE status = 'ACTIVE' AND is_deleted = false`
        );

        const totalIncome = parseFloat(incomeResult.rows[0].total) || 0;
        const totalExpenses = (parseFloat(expensesResult.rows[0].total) || 0) +
            (parseFloat(salariesResult.rows[0].total) || 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            machines: {
                total: parseInt(machinesResult.rows[0].total) || 0,
                active: parseInt(machinesResult.rows[0].active) || 0,
                stopped: parseInt(machinesResult.rows[0].stopped) || 0,
                maintenance: parseInt(machinesResult.rows[0].maintenance) || 0
            },
            finance: {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit: netProfit
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET machine efficiency data
router.get('/efficiency', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        m.machine_number,
        m.machine_type,
        COALESCE(SUM(o.hours_worked), 0) as total_hours,
        COUNT(DISTINCT o.operation_date) as days_operated
      FROM machines m
      LEFT JOIN operations o ON m.id = o.machine_id
        AND EXTRACT(YEAR FROM o.operation_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM o.operation_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND o.is_deleted = false
      WHERE m.is_deleted = false
      GROUP BY m.id, m.machine_number, m.machine_type
      ORDER BY m.machine_number
    `);

        const efficiency = result.rows.map(row => ({
            machine_number: row.machine_number,
            machine_type: row.machine_type,
            total_hours: parseFloat(row.total_hours) || 0,
            days_operated: parseInt(row.days_operated) || 0,
            avg_hours_per_day: row.days_operated > 0
                ? (parseFloat(row.total_hours) / parseInt(row.days_operated)).toFixed(2)
                : 0
        }));

        res.json(efficiency);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET recent transactions
router.get('/recent-transactions', async (req, res) => {
    try {
        const limit = req.query.limit || 5;

        const result = await pool.query(
            `SELECT t.*, c.name as client_name, s.name as shareholder_name, m.machine_number 
             FROM transactions t
             LEFT JOIN clients c ON t.client_id = c.id
             LEFT JOIN shareholders s ON t.shareholder_id = s.id
             LEFT JOIN machines m ON t.machine_id = m.id
             WHERE t.is_deleted = false
             ORDER BY t.created_at DESC
             LIMIT $1`,
            [limit]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
