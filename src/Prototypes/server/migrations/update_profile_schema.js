const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Adding missing columns to user_profiles...');

        // Add columns if they don't exist
        await client.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS high_contrast_mode BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS font_size VARCHAR(20) DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS screen_reader_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
