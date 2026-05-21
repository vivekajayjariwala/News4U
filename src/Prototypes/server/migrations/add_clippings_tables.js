const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        await client.query(`
            CREATE TABLE IF NOT EXISTS clippings (
              clipping_id UUID PRIMARY KEY,
              user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              public_id UUID UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS clipping_items (
              id SERIAL PRIMARY KEY,
              clipping_id UUID REFERENCES clippings(clipping_id) ON DELETE CASCADE,
              article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE (clipping_id, article_id)
            );
        `);

        await client.query('CREATE INDEX IF NOT EXISTS idx_clippings_user_id ON clippings(user_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_clipping_items_clipping_id ON clipping_items(clipping_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_clipping_items_article_id ON clipping_items(article_id);');

        console.log('Added clippings tables');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
