import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET monthly profit report
router.get('/monthly/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        // Get all machines (not deleted)
        const machinesResult = await pool.query(`
            SELECT m.*, s.name as shareholder_name 
            FROM machines m
            LEFT JOIN shareholders s ON m.shareholder_id = s.id
            WHERE m.is_deleted = false
            ORDER BY m.machine_number
        `);
        const machines = machinesResult.rows;

        // Get active machines count for expense allocation
        const activeMachinesCount = machines.filter(m => m.status === 'ACTIVE').length;

        if (activeMachinesCount === 0 && machines.length === 0) {
            return res.json({ error: 'No machines found', report: [] });
        }

        // Get total monthly salaries (not deleted)
        const salariesResult = await pool.query(
            `SELECT COALESCE(SUM(monthly_salary), 0) as total 
             FROM employees WHERE status = 'ACTIVE' AND is_deleted = false`
        );
        const totalSalaries = parseFloat(salariesResult.rows[0].total) || 0;

        // Get shared expenses (electricity, rent, etc.) (not deleted)
        const sharedExpensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM transactions 
             WHERE transaction_type = 'EXPENSE' 
               AND machine_id IS NULL
               AND shareholder_id IS NULL
               AND EXTRACT(YEAR FROM transaction_date) = $1 
               AND EXTRACT(MONTH FROM transaction_date) = $2
               AND is_deleted = false`,
            [year, month]
        );
        const sharedExpenses = parseFloat(sharedExpensesResult.rows[0].total) || 0;
        const totalSharedExpenses = totalSalaries + sharedExpenses;

        // Calculate days per machine
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${totalDaysInMonth}`;

        const statusLogsResult = await pool.query(`
            WITH status_ranges AS (
                SELECT 
                    sl.machine_id,
                    sl.status,
                    GREATEST(sl.start_date, $1::timestamp) as effective_start,
                    LEAST(COALESCE(sl.end_date, CURRENT_TIMESTAMP), ($2::date + interval '1 day')::timestamp) as effective_end
                FROM machine_status_logs sl
                JOIN machines m ON sl.machine_id = m.id
                WHERE sl.start_date < ($2::date + interval '1 day')
                  AND (sl.end_date IS NULL OR sl.end_date > $1::timestamp)
                  AND m.is_deleted = false
            )
            SELECT 
                machine_id,
                status,
                SUM(EXTRACT(EPOCH FROM (effective_end - effective_start)) / 86400) as total_days
            FROM status_ranges
            GROUP BY machine_id, status
        `, [startDate, endDate]);

        const machineMetrics = {};
        statusLogsResult.rows.forEach(row => {
            if (!machineMetrics[row.machine_id]) {
                machineMetrics[row.machine_id] = { working: 0, stopped: 0, maintenance: 0 };
            }
            if (row.status === 'ACTIVE') machineMetrics[row.machine_id].working = parseFloat(row.total_days);
            if (row.status === 'STOPPED') machineMetrics[row.machine_id].stopped = parseFloat(row.total_days);
            if (row.status === 'MAINTENANCE') machineMetrics[row.machine_id].maintenance = parseFloat(row.total_days);
        });

        const totalWorkingDaysAllMachines = Object.values(machineMetrics).reduce((sum, m) => sum + m.working, 0);

        // Build report for each machine
        const report = [];

        for (const machine of machines) {
            // Get machine revenue from production logs (not deleted)
            const revenueResult = await pool.query(
                `SELECT COALESCE(SUM(total_amount), 0) as total FROM production_logs 
                 WHERE machine_id = $1 AND EXTRACT(YEAR FROM log_date) = $2 AND EXTRACT(MONTH FROM log_date) = $3 AND is_deleted = false`,
                [machine.id, year, month]
            );
            const revenue = parseFloat(revenueResult.rows[0].total) || 0;

            // Get maintenance costs (not deleted)
            const maintenanceResult = await pool.query(
                `SELECT COALESCE(SUM(cost), 0) as total FROM maintenance 
                 WHERE machine_id = $1 AND EXTRACT(YEAR FROM maintenance_date) = $2 AND EXTRACT(MONTH FROM maintenance_date) = $3 AND is_deleted = false`,
                [machine.id, year, month]
            );
            const maintenanceCost = parseFloat(maintenanceResult.rows[0].total) || 0;

            // Get machine-specific expenses from transactions (not deleted)
            const directExpensesResult = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
                 WHERE transaction_type = 'EXPENSE' AND machine_id = $1 AND EXTRACT(YEAR FROM transaction_date) = $2 AND EXTRACT(MONTH FROM transaction_date) = $3 AND is_deleted = false`,
                [machine.id, year, month]
            );
            const directExpenses = parseFloat(directExpensesResult.rows[0].total) || 0;

            // Get machine-specific fixed and variable costs (not deleted)
            const costsResult = await pool.query(
                `SELECT category, amount, cost_type FROM machine_costs 
                 WHERE machine_id = $1 
                 AND (cost_type = 'FIXED' OR (cost_type = 'VARIABLE' AND EXTRACT(YEAR FROM billing_month) = $2 AND EXTRACT(MONTH FROM billing_month) = $3))
                 AND is_deleted = false`,
                [machine.id, year, month]
            );

            const costBreakdown = costsResult.rows.map(c => ({ category: c.category, amount: parseFloat(c.amount), type: c.cost_type }));
            const fixedCosts = costBreakdown.filter(c => c.type === 'FIXED').reduce((sum, c) => sum + c.amount, 0);
            const variableCosts = costBreakdown.filter(c => c.type === 'VARIABLE').reduce((sum, c) => sum + c.amount, 0);

            // Metrics
            const metrics = machineMetrics[machine.id] || { working: 0, stopped: 0, maintenance: 0 };
            const utilization = (metrics.working / totalDaysInMonth) * 100;

            // Allocate Shared Expenses
            const machineWorkingDays = metrics.working;
            const allocatedExpenses = totalWorkingDaysAllMachines > 0
                ? (machineWorkingDays / totalWorkingDaysAllMachines) * totalSharedExpenses
                : (machine.status === 'ACTIVE' ? totalSharedExpenses / (activeMachinesCount || 1) : 0);

            const totalDirectExpenses = maintenanceCost + directExpenses + fixedCosts + variableCosts;
            const totalExpenses = totalDirectExpenses + allocatedExpenses;
            const netProfit = revenue - totalExpenses;

            // Apply profit sharing logic
            let factoryShare, shareholderShare;
            if (machine.owner_type === 'FACTORY') {
                factoryShare = netProfit;
                shareholderShare = 0;
            } else { // SHAREHOLDER-owned
                const factoryPercentage = parseFloat(machine.factory_profit_percentage) || 50;
                factoryShare = netProfit * (factoryPercentage / 100);
                shareholderShare = netProfit * ((100 - factoryPercentage) / 100);
            }

            report.push({
                machine_id: machine.id,
                machine_number: machine.machine_number,
                machine_type: machine.machine_type,
                owner_type: machine.owner_type,
                shareholder_name: machine.shareholder_name,
                status: machine.status,
                metrics: {
                    working_days: metrics.working,
                    stopped_days: metrics.stopped,
                    maintenance_days: metrics.maintenance,
                    utilization: utilization
                },
                financials: {
                    revenue: revenue,
                    maintenance_cost: maintenanceCost,
                    direct_expenses: directExpenses,
                    fixed_costs: fixedCosts,
                    variable_costs: variableCosts,
                    cost_breakdown: costBreakdown,
                    allocated_expenses: allocatedExpenses,
                    total_expenses: totalExpenses,
                    net_profit: netProfit,
                    factory_share: factoryShare,
                    shareholder_share: shareholderShare
                }
            });
        }

        // Calculate summary
        const summary = {
            total_revenue: report.reduce((sum, m) => sum + m.financials.revenue, 0),
            total_expenses: report.reduce((sum, m) => sum + m.financials.total_expenses, 0),
            total_net_profit: report.reduce((sum, m) => sum + m.financials.net_profit, 0),
            total_factory_share: report.reduce((sum, m) => sum + m.financials.factory_share, 0),
            total_shareholder_share: report.reduce((sum, m) => sum + m.financials.shareholder_share, 0),
            total_salaries: totalSalaries,
            shared_expenses: sharedExpenses,
            total_working_days: totalWorkingDaysAllMachines,
            active_machines_count: activeMachinesCount,
            total_days_in_month: totalDaysInMonth
        };

        res.json({ report, summary, year: parseInt(year), month: parseInt(month) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET machine-specific report
router.get('/machine/:id/:year/:month', async (req, res) => {
    try {
        const { id, year, month } = req.params;

        // Get machine details (even if soft-deleted, but show as such)
        const machineResult = await pool.query(
            `SELECT m.*, s.name as shareholder_name 
             FROM machines m
             LEFT JOIN shareholders s ON m.shareholder_id = s.id
             WHERE m.id = $1`,
            [id]
        );

        if (machineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const machine = machineResult.rows[0];

        // Get operations (not deleted)
        const operations = await pool.query(
            `SELECT * FROM operations 
             WHERE machine_id = $1 
               AND EXTRACT(YEAR FROM operation_date) = $2 
               AND EXTRACT(MONTH FROM operation_date) = $3
               AND is_deleted = false
             ORDER BY operation_date`,
            [id, year, month]
        );

        // Get maintenance (not deleted)
        const maintenance = await pool.query(
            `SELECT * FROM maintenance 
             WHERE machine_id = $1 
               AND EXTRACT(YEAR FROM maintenance_date) = $2 
               AND EXTRACT(MONTH FROM maintenance_date) = $3
               AND is_deleted = false
             ORDER BY maintenance_date`,
            [id, year, month]
        );

        // Get production logs (not deleted)
        const production = await pool.query(
            `SELECT p.*, c.name as client_name 
             FROM production_logs p
             LEFT JOIN clients c ON p.client_id = c.id
             WHERE p.machine_id = $1 
               AND EXTRACT(YEAR FROM p.log_date) = $2 
               AND EXTRACT(MONTH FROM p.log_date) = $3
               AND is_deleted = false
             ORDER BY p.log_date`,
            [id, year, month]
        );

        // Get direct expenses (not deleted)
        const expenses = await pool.query(
            `SELECT * FROM transactions 
             WHERE machine_id = $1 
               AND transaction_type = 'EXPENSE'
               AND EXTRACT(YEAR FROM transaction_date) = $2 
               AND EXTRACT(MONTH FROM transaction_date) = $3
               AND is_deleted = false
             ORDER BY transaction_date`,
            [id, year, month]
        );

        res.json({
            machine,
            operations: operations.rows,
            maintenance: maintenance.rows,
            production: production.rows,
            expenses: expenses.rows,
            year: parseInt(year),
            month: parseInt(month)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
