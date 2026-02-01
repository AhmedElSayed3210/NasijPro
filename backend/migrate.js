import pool from './config/database.js';

const migration = `
CREATE TABLE IF NOT EXISTS machine_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'STOPPED', 'MAINTENANCE')),
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_logs_machine ON machine_status_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_dates ON machine_status_logs(start_date, end_date);
`;

async function run() {
    try {
        await pool.query(migration);
        console.log('Migration successful: machine_status_logs table created.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

run();
