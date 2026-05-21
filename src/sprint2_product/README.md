# Sprint 2 Product Increment

## Increment name
Sprint 2 Deployment-Ready Increment for News 4 U

## Core user journey supported end-to-end flow
1. User registers or logs in (email verified).
2. User sets preferences (topics, reading level).
3. Home displays a preference-aware carousel of headlines.
4. User opens an article, reads content, and can generate a learning roadmap.
5. User saves articles into clippings and can share clippings via public links.
6. User views clipping recommendations and adds suggested articles to their clipping.
7. (Optional, Admin) Admin manages users (promote to admin, deactivate/delete) via the admin interface.

## New features added in Sprint 2
- Personalized headline feed based on user preferences (uses profile topics to bias the feed).
- Article fetching pipeline with AI integrations (stores and enriches headlines from external sources).
- Complexity scoring and AI summaries for articles (uses Hugging Face models, e.g., Qwen/Qwen2.5-7B-Instruct, with a readability prompt to label beginner/intermediate/advanced).
- Article summary generation (Google Gemini via AI services summarizes/re-writes article text using gemini-2.5-flash-lite).
- Learning roadmap generation from source articles (builds a multi-step learning path and ranks steps using topic/keyword relevance + stored complexity signals).
- Roadmap summary generation (Google Gemini via AI services summarizes the roadmap into a short 2–3 sentence overview).
- Embedding generation (Google Gemini embeddings via gemini-embedding-001, 3072-dim vectors for similarity/search).
- Improved roadmap article relevance and retrieval (topic/keyword matching for better steps).
- Embedding fixes and updated vector handling (stabilizes similarity/search features).
- Clippings system (create, view, add articles, shareable public links).
- Quick add to clipping from headlines (one-click save with clipping chooser).
- Clipping recommendations by topic with carousel layout (suggests similar articles).
- Home page headline carousel based on user preferences (shows curated stories on landing).
- UI refinements: carousel controls, spacing buffers, improved article card actions.
- Admin management interface: promote users to admin and delete/deactivate accounts.

## Deployment environment
- Local deployment (Node.js + PostgreSQL/Yugabyte compatible)
- **Deployed on Render (backend + frontend services with shared PostgreSQL/Yugabyte-compatible cluster).**
- Public URL: https://news4u-p05e.onrender.com

## Setup / launch instructions (FOR LOCAL ENVIRONMENT)
1. **Install backend dependencies**
	 - From the repo root:
		 ```bash
		 npm install
		 ```

2. **Configure environment variables**
	- This submission assumes the provided database cluster, API keys, and credentials are already configured.
	- Ensure CORS_ALLOWED_ORIGINS includes http://localhost:3000.

3. **Install frontend dependencies**
	```bash
	cd src/Prototypes/client
	npm install
	```

4. **Configure frontend API URL**
	 - Create src/Prototypes/client/.env with:
		 ```env
		 REACT_APP_API_URL=http://localhost:3001
		 ```

5. **Prepare the database**
	- **IMPORTANT:** Migrations are **usually NOT required** because the shared cluster is already provisioned.
	- **Only run these if explicitly told the schema is out of date.**
	- If needed, run migrations in this order:
		 ```bash
		 node src/Prototypes/server/migrations/run.js
		 node src/Prototypes/server/migrations/add_image_column.js
		 node src/Prototypes/server/migrations/update_embedding_dim.js
		 node src/Prototypes/server/migrations/update_profile_schema.js
		 node src/Prototypes/server/migrations/add_clippings_tables.js
		 ```

6. **Start the backend**
	 - From the repo root:
		 ```bash
		 npm run dev
		 ```
	 - API runs on PORT from .env (default 3001).

7. **Start the frontend**
	```bash
	cd src/Prototypes/client
	npm start
	```
	- App runs on http://localhost:3000

## User credentials (if authentication required)
- Admin user: admin@example.com
- Password: Admin!123

## Test data / sample inputs
- Use the included headline fetchers and Guardian backfill to populate articles.
- Optional: seed user profiles to test preference-based feeds.

## Execution flow script (detailed)
1. **(Optional — usually NOT needed)** Apply migrations only if the shared cluster schema is out of date (see step 5 above).
2. Start backend server and confirm health:
	```bash
	npm run dev
	# visit http://localhost:3001/api/health
	```
3. Start frontend:
	```bash
	cd src/Prototypes/client
	npm start
	# visit http://localhost:3000
	```
4. Register a user and verify email (or use admin credentials below if configured).
5. Open Settings and save preferences (topics + reading level).
6. Visit Home to view the preference-based headline carousel.
7. Open an article and click Add to Clipping; create a clipping if prompted.
8. Open the clipping view and add recommended articles from the carousel.
9. Click Share to open the public clipping link.
10. (Optional, Admin) Open Admin panel to promote users to admin or delete/deactivate accounts.
