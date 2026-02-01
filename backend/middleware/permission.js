import pool from '../config/database.js';

export const checkPermission = (pageName) => {
    return async (req, res, next) => {
        try {
            // Admin has full access
            if (req.user && req.user.role === 'ADMIN') {
                return next();
            }

            // Check if user has explicit access to this page
            const result = await pool.query(
                'SELECT has_access FROM user_permissions WHERE user_id = $1 AND page_name = $2',
                [req.user.id, pageName]
            );

            if (result.rows.length > 0 && result.rows[0].has_access) {
                return next();
            }

            // No permission
            res.status(403).json({ error: `ليس لديك صلاحية للوصول إلى ${pageName}` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
};
