const fs = require('fs');
const path = require('path');
const config = require('../config/env');
// Manually create pool to debug config
const { Pool } = require('pg');

async function run() {
    console.log('DB Config:', {
        ...config.db,
        password: config.db.password ? '***' : undefined,
        connectionString: config.db.connectionString ? 'REDACTED_URL' : undefined
    });

    const pool = new Pool(config.db);

    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

run();
