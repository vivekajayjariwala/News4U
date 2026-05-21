-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (aligned with auth schema)
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  preferred_topics TEXT[], -- Array of strings
  complexity_preference VARCHAR(50),
  high_contrast_mode BOOLEAN DEFAULT FALSE,
  font_size VARCHAR(20) DEFAULT 'medium',
  screen_reader_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash VARCHAR(512) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  guardian_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  author VARCHAR(255),
  published_at TIMESTAMP WITH TIME ZONE,
  topic VARCHAR(100),
  url TEXT,
  image TEXT,
  embedding vector(3072), -- 3072 dimensions after update
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article complexity (computed on-demand, cached per article)
CREATE TABLE IF NOT EXISTS article_complexity (
  id SERIAL PRIMARY KEY,
  article_id INTEGER UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
  complexity_label VARCHAR(50) NOT NULL,
  complexity_score NUMERIC(5,4),
  model VARCHAR(255),
  raw_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_complexity_article_id ON article_complexity(article_id);
CREATE INDEX IF NOT EXISTS idx_article_complexity_label ON article_complexity(complexity_label);

-- Article term definitions (cached glossary)
CREATE TABLE IF NOT EXISTS article_term_definitions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (article_id, term)
);

CREATE INDEX IF NOT EXISTS idx_article_term_definitions_article_id ON article_term_definitions(article_id);

-- Article rewrites (cached simplified versions)
CREATE TABLE IF NOT EXISTS article_rewrites (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  target_level VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (article_id, target_level)
);

CREATE INDEX IF NOT EXISTS idx_article_rewrites_article_id ON article_rewrites(article_id);

-- Roadmaps (user-owned, shareable)
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

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);

-- Roadmap items (ordered articles with frozen complexity snapshot)
CREATE TABLE IF NOT EXISTS roadmap_items (
  id SERIAL PRIMARY KEY,
  roadmap_id UUID REFERENCES roadmaps(roadmap_id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  complexity_label VARCHAR(50),
  complexity_score NUMERIC(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_roadmap_id ON roadmap_items(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_article_id ON roadmap_items(article_id);

-- User Interactions (for learning)
CREATE TABLE IF NOT EXISTS user_interactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'read', 'rewrite', 'like'
  metadata JSONB, -- For storing specific rewrite params or read time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clippings (user-owned, shareable)
CREATE TABLE IF NOT EXISTS clippings (
  clipping_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  public_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clippings_user_id ON clippings(user_id);

-- Clipping items
CREATE TABLE IF NOT EXISTS clipping_items (
  id SERIAL PRIMARY KEY,
  clipping_id UUID REFERENCES clippings(clipping_id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clipping_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_clipping_items_clipping_id ON clipping_items(clipping_id);
CREATE INDEX IF NOT EXISTS idx_clipping_items_article_id ON clipping_items(article_id);
