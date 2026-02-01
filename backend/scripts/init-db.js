
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default DB first
};

async function initDB() {
  console.log('Connecting to PostgreSQL...');
  const client = new pg.Client(config);

  try {
    await client.connect();
    
    // Check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'textile_erp'");
    
    if (res.rowCount === 0) {
      console.log("Database 'textile_erp' does not exist. Creating...");
      await client.query('CREATE DATABASE textile_erp');
      console.log("Database 'textile_erp' created successfully.");
      
      // Now connect to the new DB and import schema
      await importSchema();
    } else {
      console.log("Database 'textile_erp' already exists.");
      // We might want to check if tables exist, but let's assume if DB exists, user might have data.
      // However, for "Run the project", we usually ensure it's runnable.
      // Let's ask the user or just proceed. 
      // If the user wants to reset, they would drop it manually or we'd add a flag.
      // For now, if it exists, we assume it's fine or we try to run schema carefully?
      // The schema has "DROP TABLE IF EXISTS", so running it will WIPE data.
      // BETTER NOT RUN SCHEMA IF DB EXISTS unless explicitly asked.
      console.log("Skipping schema import to avoid data loss. If you want to reset, drop the database first.");
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function importSchema() {
  console.log('Importing schema...');
  const schemaConfig = { ...config, database: 'textile_erp' };
  const client = new pg.Client(schemaConfig);
  
  try {
    await client.connect();
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSql);
    console.log('Schema imported successfully.');
  } catch (err) {
    console.error('Error importing schema:', err);
    throw err;
  } finally {
    await client.end();
  }
}

initDB();
