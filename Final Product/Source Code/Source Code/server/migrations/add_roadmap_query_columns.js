const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        await client.query('ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS query_terms TEXT;');
        await client.query("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS fetch_status VARCHAR(20) DEFAULT 'pending';");

        console.log('Added roadmap query columns');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
