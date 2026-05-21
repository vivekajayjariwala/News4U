const { Client } = require('pg');
const config = require('../config/env');

async function run() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Drop tables if they exist with wrong schema (Cascade to user_interactions)
        console.log('Dropping old tables...');
        await client.query('DROP TABLE IF EXISTS user_interactions CASCADE');
        await client.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
        await client.query('DROP TABLE IF EXISTS user_profiles CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        // Note: We keep `articles` table as is (except we'll recreate user_interactions fetching from it)

        // 2. Create users table (Matching authController.js)
        console.log('Creating users table...');
        await client.query(`
      CREATE TABLE users (
        user_id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_admin BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 3. Create user_profiles table
        console.log('Creating user_profiles table...');
        await client.query(`
      CREATE TABLE user_profiles (
        profile_id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        full_name VARCHAR(255),
        preferred_topics TEXT[], -- Array of strings
        complexity_preference VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 4. Re-create user_interactions table with UUID foreign key
        console.log('Creating user_interactions table...');
        await client.query(`
      CREATE TABLE user_interactions (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 5. Create refresh_tokens table
        console.log('Creating refresh_tokens table...');
        await client.query(`
      CREATE TABLE refresh_tokens (
        token_id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash VARCHAR(512) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
