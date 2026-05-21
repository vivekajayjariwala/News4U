const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        await client.query(`
            CREATE TABLE IF NOT EXISTS alerts (
              alert_id UUID PRIMARY KEY,
              user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
              topics TEXT[], -- Array of topic strings, similar to user_profiles.preferred_topics
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);');

        console.log('Added alerts table');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();