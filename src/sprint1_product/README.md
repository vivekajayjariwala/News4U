# Sprint 1 Product Increment

## Increment name
Sprint 1 Functional Prototype for News 4 U

# Core user journey supported end-to-end flow
1. User registers for an account.
2. User logs in using email and password.
3. User views aggregated headlines on the home page.
4. User opens an article to read abbreviated content, can click the link to see full article.
5. User updates profile preferences (topics, reading level).
6. (Optional, Admin) Admin logs in using preconfigured credentials.

# Features added in Sprint 1
- User authentication (registration and login with JWT-based authentication).
- Secure password handling and session management.
- Profile system (stores user topic preferences and reading level).
- Basic news headline aggregation from external sources.
- Article detail page rendering full content.
- Backend API built with Express.js (Node.js).
- PostgreSQL / Yugabyte-compatible database integration.
- Initial database schema for users, profiles, and articles.
- React frontend prototype with routing and page navigation.
- CORS configuration for frontend–backend communication.
- Preconfigured admin role structure and sample admin account.

# Deployment environment
- Local deployment (Node.js + PostgreSQL/Yugabyte compatible).
- Designed for full-stack execution (React frontend + Express backend).

# Setup / launch instructions (FOR LOCAL ENVIRONMENT)
1. **Install prerequisites**
  - Node.js 18+, PostgreSQL or compatible managed cluster, npm
  
2. **Clone repository**
    git clone https://github.com/UWO-ECE-Software-Engineering/Agile-Alligators.git
    cd Agile-Alligators

3. **Install backend dependencies**
  npm install

4. **Install frontend dependencies**
  cd src/Prototypes/client
  npm install

5. **Configure environment variables**
  - Copy .env.example from env/ to project root as .env.
  - Fill in database credentials, JWT secret, API keys, and CORS_ALLOWED_ORIGINS (include http://localhost:3000).
  - Create src/Prototypes/client/.env with REACT_APP_API_URL=http://localhost:3001

6. **Prepare database**
  - Create the database specified in .env.

7. **Start backend**
- npm run dev
- (Runs on default port 3001 unless specified in .env.)

8. **Start frontend**
  cd src/Prototypes/client
  npm start
  (Runs on http://localhost:3000.)

## User credentials (if authentication required)
- Admin user: admin@example.com
- Password: Admin!123

## Test data / sample inputs
- Register a new user to test authentication flow.
- Use built-in headline aggregation endpoints to fetch sample articles.
- Update profile preferences to verify database persistence.

# Execution flow script (detailed)
- Start backend server (npm run dev).
- Start frontend (npm start inside client folder).
- Visit http://localhost:3000.
- Register a new user or log in with admin credentials.
- Navigate to Profile/Settings and save preferences.
- Browse headlines on the home page.
- Open an article to view full content.
- Log out and log back in to confirm authentication persistence.