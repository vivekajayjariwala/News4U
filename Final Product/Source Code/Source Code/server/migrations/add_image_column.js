// server/migrations/add_image_column.js
const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');
        await client.query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS image TEXT;');
        console.log('Added image column');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
