const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        await client.query(`
            CREATE TABLE IF NOT EXISTS article_complexity (
              id SERIAL PRIMARY KEY,
              article_id INTEGER UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
              complexity_label VARCHAR(50) NOT NULL,
              complexity_score NUMERIC(5,4),
              model VARCHAR(255),
              raw_scores JSONB,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('CREATE INDEX IF NOT EXISTS idx_article_complexity_article_id ON article_complexity(article_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_article_complexity_label ON article_complexity(complexity_label);');

        await client.query(`
            CREATE TABLE IF NOT EXISTS roadmaps (
              roadmap_id UUID PRIMARY KEY,
              user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
              name TEXT NOT NULL,
                            source_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
              public_id UUID UNIQUE NOT NULL,
                            total_items INTEGER DEFAULT 0,
                            completed_items INTEGER DEFAULT 0,
                            status VARCHAR(20) DEFAULT 'pending',
                            description TEXT,
                            query_terms TEXT,
                            fetch_status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);');

        await client.query(`
            CREATE TABLE IF NOT EXISTS roadmap_items (
              id SERIAL PRIMARY KEY,
              roadmap_id UUID REFERENCES roadmaps(roadmap_id) ON DELETE CASCADE,
              article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
              step_order INTEGER NOT NULL,
              complexity_label VARCHAR(50),
              complexity_score NUMERIC(5,4),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('CREATE INDEX IF NOT EXISTS idx_roadmap_items_roadmap_id ON roadmap_items(roadmap_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_roadmap_items_article_id ON roadmap_items(article_id);');

        console.log('Added roadmap tables');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
