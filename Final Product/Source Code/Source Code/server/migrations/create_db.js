const { Client } = require('pg');
const config = require('../config/env');

async function createDb() {
    console.log('Connecting with config:', {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        database: config.db.database,
        ssl: config.db.ssl ? { ...config.db.ssl, ca: config.db.ssl.ca ? 'PRESENT' : 'MISSING' } : 'DISABLED'
    });

    const client = new Client({
        ...config.db,
        connectionTimeoutMillis: 5000 // 5s timeout
    });

    try {
        console.log('Initiating connection...');
        await client.connect();
        console.log('Connected to Yugabyte.');

        // Check if db exists
        console.log('Checking for database news4u...');
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'news4u'");
        if (res.rowCount === 0) {
            console.log('Creating database news4u...');
            await client.query('CREATE DATABASE news4u');
            console.log('Database created.');
        } else {
            console.log('Database news4u already exists.');
        }
    } catch (err) {
        console.error('Connection/Query Error:', err);
    } finally {
        try { await client.end(); } catch { }
    }
}

createDb();
