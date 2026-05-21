const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Clearing existing embeddings due to dimension change...');
        await client.query('UPDATE articles SET embedding = NULL');

        console.log('Altering embedding column to 3072 dimensions...');
        await client.query('ALTER TABLE articles ALTER COLUMN embedding TYPE vector(3072);');

        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
