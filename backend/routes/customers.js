import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all customers
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single customer
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET customer balance
router.get('/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;

        // Get opening balance
        const customerResult = await pool.query('SELECT opening_balance FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const openingBalance = parseFloat(customerResult.rows[0].opening_balance) || 0;

        // Get total sales (increases balance - customer owes us)
        const salesResult = await pool.query(
            'SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id = $1',
            [id]
        );
        const totalSales = parseFloat(salesResult.rows[0].total) || 0;

        // Get total income/payments (decreases balance - customer paid us)
        const incomeResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE customer_id = $1 AND transaction_type = 'INCOME'`,
            [id]
        );
        const totalIncome = parseFloat(incomeResult.rows[0].total) || 0;

        // Get customer-specific expenses (increases balance)
        const expenseResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE customer_id = $1 AND transaction_type = 'EXPENSE'`,
            [id]
        );
        const totalExpenses = parseFloat(expenseResult.rows[0].total) || 0;

        // Current Balance = Opening Balance + Sales + Expenses - Income
        const currentBalance = openingBalance + totalSales + totalExpenses - totalIncome;

        res.json({
            opening_balance: openingBalance,
            total_sales: totalSales,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            current_balance: currentBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET customer statement
router.get('/:id/statement', async (req, res) => {
    try {
        const { id } = req.params;

        // Get all transactions
        const transactions = await pool.query(
            `SELECT * FROM transactions WHERE customer_id = $1 ORDER BY transaction_date DESC`,
            [id]
        );

        // Get all sales
        const sales = await pool.query(
            `SELECT s.*, m.machine_number FROM sales s
       LEFT JOIN machines m ON s.machine_id = m.id
       WHERE s.customer_id = $1 ORDER BY s.sale_date DESC`,
            [id]
        );

        res.json({
            transactions: transactions.rows,
            sales: sales.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create customer
router.post('/', async (req, res) => {
    try {
        const { name, phone, opening_balance } = req.body;

        const result = await pool.query(
            'INSERT INTO customers (name, phone, opening_balance) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, opening_balance || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, opening_balance } = req.body;

        const result = await pool.query(
            'UPDATE customers SET name = $1, phone = $2, opening_balance = $3 WHERE id = $4 RETURNING *',
            [name, phone, opening_balance, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
