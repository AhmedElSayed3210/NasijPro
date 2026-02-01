import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all users (Admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, username, role, status, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update user status (Admin only)
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: 'حالة غير صالحة' });
        }

        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE user (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET user permissions (Admin only)
router.get('/:id/permissions', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT page_name, has_access FROM user_permissions WHERE user_id = $1',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE user permissions (Admin only)
router.post('/:id/permissions', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { permissions } = req.body; // Array of { page_name, has_access }

        await client.query('BEGIN');

        for (const p of permissions) {
            await client.query(
                `INSERT INTO user_permissions (user_id, page_name, has_access)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, page_name)
                 DO UPDATE SET has_access = EXCLUDED.has_access`,
                [id, p.page_name, p.has_access]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'تم تحديث الصلاحيات بنجاح' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
