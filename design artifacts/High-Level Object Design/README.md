# High-Level Object Design — News-for-U (V2)

This folder contains the Version 2 domain model (`news-for-u-domain-model-v2.mermaid`) aligned to the project's database schema and migrations.

Summary of what's included in V2
- `User` and `user_profiles` now use `UUID` primary keys and include accessibility preference fields (e.g. `high_contrast_mode`, `font_size`, `screen_reader_enabled`, `updated_at`).
- `refresh_tokens` table stores token metadata for refresh flow.
- `articles` includes `image` and a `pgvector` `embedding` column (the schema copy found here uses 3072 dimensions).
- New cached tables: `article_complexity` (complexity snapshot per article).
- Feature-backed tables: `roadmaps` + `roadmap_items` and `clippings` + `clipping_items` for shareable user content.
- `user_interactions` records reads/re-writes/likes with `metadata` JSONB.

Notable differences vs older diagram
- Embedding dimension changed across migrations (check `update_embedding_dim.js`).
- Roadmaps/Clippings and complexity snapshots are new persisted concepts compared to the original domain diagram.

How to view the diagram
- Open `news-for-u-domain-model-v2.mermaid` in VS Code with a Mermaid preview extension, or copy the content into the Mermaid Live Editor (https://mermaid.live).

