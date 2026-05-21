const pool = require('../db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS article_term_definitions (
              id SERIAL PRIMARY KEY,
              article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
              term TEXT NOT NULL,
              definition TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE (article_id, term)
            );
        `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_article_term_definitions_article_id ON article_term_definitions(article_id);');

        await client.query(`
            CREATE TABLE IF NOT EXISTS article_rewrites (
              id SERIAL PRIMARY KEY,
              article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
              target_level VARCHAR(50) NOT NULL,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              UNIQUE (article_id, target_level)
            );
        `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_article_rewrites_article_id ON article_rewrites(article_id);');

        await client.query('COMMIT');
        console.log('Added article term definitions and rewrites tables');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
    }
}

run();