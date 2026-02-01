import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all sales
router.get('/', async (req, res) => {
    try {
        const { machine_id, customer_id, start_date, end_date } = req.query;

        let query = `
      SELECT s.*, m.machine_number, c.name as customer_name 
      FROM sales s
      LEFT JOIN machines m ON s.machine_id = m.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (machine_id) {
            params.push(machine_id);
            query += ` AND s.machine_id = $${params.length}`;
        }

        if (customer_id) {
            params.push(customer_id);
            query += ` AND s.customer_id = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND s.sale_date >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND s.sale_date <= $${params.length}`;
        }

        query += ' ORDER BY s.sale_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create sale
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { machine_id, customer_id, product_name, quantity, unit_price, sale_date, notes } = req.body;

        const result = await client.query(
            `INSERT INTO sales (machine_id, customer_id, product_name, quantity, unit_price, sale_date, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [machine_id, customer_id || null, product_name, quantity, unit_price, sale_date, notes]
        );

        const newSale = result.rows[0];

        // Automatically create income transaction
        await client.query(
            `INSERT INTO transactions (transaction_type, category, amount, transaction_date, customer_id, machine_id, description)
       VALUES ('INCOME', 'Sales', $1, $2, $3, $4, $5)`,
            [newSale.total_amount, sale_date, customer_id || null, machine_id, `فاتورة مبيعات: ${product_name} (${quantity} وحدة)`]
        );

        await client.query('COMMIT');
        res.status(201).json(newSale);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PUT update sale
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { machine_id, customer_id, product_name, quantity, unit_price, sale_date, notes } = req.body;

        // Get old sale to update transaction
        const oldSaleResult = await client.query('SELECT * FROM sales WHERE id = $1', [id]);
        if (oldSaleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sale not found' });
        }
        const oldSale = oldSaleResult.rows[0];

        const result = await client.query(
            `UPDATE sales 
       SET machine_id = $1, customer_id = $2, product_name = $3, 
           quantity = $4, unit_price = $5, sale_date = $6, notes = $7
       WHERE id = $8 RETURNING *`,
            [machine_id, customer_id || null, product_name, quantity, unit_price, sale_date, notes, id]
        );

        const updatedSale = result.rows[0];

        // Update corresponding transaction
        // We find it by matching the old amount, date, and machine/customer (best effort)
        // Note: In a production app, adding a sale_id to transactions would be better.
        await client.query(
            `UPDATE transactions 
             SET amount = $1, transaction_date = $2, customer_id = $3, machine_id = $4, description = $5
             WHERE transaction_type = 'INCOME' AND category = 'Sales' 
               AND amount = $6 AND transaction_date = $7 AND machine_id = $8`,
            [updatedSale.total_amount, sale_date, customer_id || null, machine_id,
            `فاتورة مبيعات: ${product_name} (${quantity} وحدة)`,
            oldSale.total_amount, oldSale.sale_date, oldSale.machine_id]
        );

        await client.query('COMMIT');
        res.json(updatedSale);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // Get sale details before deleting
        const saleResult = await client.query('SELECT * FROM sales WHERE id = $1', [id]);
        if (saleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sale not found' });
        }
        const sale = saleResult.rows[0];

        // Delete the sale
        await client.query('DELETE FROM sales WHERE id = $1', [id]);

        // Delete corresponding transaction
        await client.query(
            `DELETE FROM transactions 
             WHERE transaction_type = 'INCOME' AND category = 'Sales' 
               AND amount = $1 AND transaction_date = $2 AND machine_id = $3`,
            [sale.total_amount, sale.sale_date, sale.machine_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Sale and linked transaction deleted successfully', sale });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
