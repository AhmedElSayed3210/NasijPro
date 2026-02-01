import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        // Check if user exists
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Determine role (First user is ADMIN, others are EMPLOYEE)
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const role = parseInt(userCount.rows[0].count) === 0 ? 'ADMIN' : 'EMPLOYEE';
        const status = role === 'ADMIN' ? 'ACTIVE' : 'PENDING';

        const result = await pool.query(
            'INSERT INTO users (name, username, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, role, status',
            [name, username, password_hash, role, status]
        );

        res.status(201).json({
            message: role === 'ADMIN' ? 'تم إنشاء حساب المدير بنجاح' : 'تم إرسال طلب التسجيل بنجاح. بانتظار موافقة المدير.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        const user = result.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        // Check status
        if (user.status !== 'ACTIVE') {
            const message = user.status === 'PENDING' ? 'حسابك بانتظار الموافقة من المدير' : 'تم إيقاف حسابك. يرجى التواصل مع المدير.';
            return res.status(403).json({ error: message });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Fetch permissions
        const permResult = await pool.query(
            'SELECT page_name, has_access FROM user_permissions WHERE user_id = $1',
            [user.id]
        );
        const permissions = permResult.rows.reduce((acc, curr) => {
            acc[curr.page_name] = curr.has_access;
            return acc;
        }, {});

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                status: user.status,
                permissions: permissions
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

export default router;
