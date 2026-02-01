import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import machineRoutes from './routes/machines.js';
import shareholderRoutes from './routes/shareholders.js';
import clientRoutes from './routes/clients.js';
import employeeRoutes from './routes/employees.js';
import operationRoutes from './routes/operations.js';
import maintenanceRoutes from './routes/maintenance.js';
import productionRoutes from './routes/production.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import machineCostsRoutes from './routes/machine_costs.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { checkPermission } from './middleware/permission.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
    res.send('Textile ERP API is running');
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Auth Routes (Public)
app.use('/api/auth', authRoutes);

// Health check endpoint (Public)
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({ status: 'healthy', database: 'connected', timestamp: new Date() });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
    }
});

// Protected API Routes
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/machines', authenticateToken, checkPermission('machines'), machineRoutes);
app.use('/api/shareholders', authenticateToken, checkPermission('shareholders'), shareholderRoutes);
app.use('/api/clients', authenticateToken, checkPermission('clients'), clientRoutes);
app.use('/api/employees', authenticateToken, checkPermission('employees'), employeeRoutes);
app.use('/api/operations', authenticateToken, checkPermission('operations'), operationRoutes);
app.use('/api/maintenance', authenticateToken, checkPermission('maintenance'), maintenanceRoutes);
app.use('/api/production', authenticateToken, checkPermission('production'), productionRoutes);
app.use('/api/transactions', authenticateToken, checkPermission('finance'), transactionRoutes);
app.use('/api/reports', authenticateToken, checkPermission('reports'), reportRoutes);
app.use('/api/dashboard', authenticateToken, checkPermission('dashboard'), dashboardRoutes);
app.use('/api/machine-costs', authenticateToken, checkPermission('machines'), machineCostsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
