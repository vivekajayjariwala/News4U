#
<div align="right">
  
  # SE 4450 – SOFTWARE ENGINEERING DESIGN II
<br/> 
<img src="/env/CourseLogo.png" height="50">
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<br/>
<strong> Capstone Project Workbook <br/>  2025/2026</strong> <br/>
<br/>

<br/>
</div>

**Project Title: news for u ^-^**
>
> Many people struggle to engage with new domains because news and commentary often assume prior knowledge and rely on industry jargon. This project aims to build an AI-powered news platform that aggregates articles, simplifies them based on user familiarity, provides contextual definitions, ensures accessibility, and recommends relevant follow-up content to support inclusive and informed learning.
>
>**Faculty Advisor:**  Dr. Yimin Yang, yimin.yang@uwo.ca <br/>
>**Industry Sponsor:** 

<div align="center">
  
<h2 align="center"> <strong> Agile Alligators</strong> </h2>
<img src="/env/AgileAlligatorsLogo.jpeg" height="200">

| Name| Email|
| :------- | :--- |
|Vivek Jariwala	|vjariwal@uwo.ca|
|Kaura Sankaran	|ksankar5@uwo.ca|
|Sharaf Syed	|ssyed243@uwo.ca|
|Scarlet Wu	|swu664@uwo.ca|

</div>

## Local Development Setup

Follow the steps below to run the API (Express) and web client (React) in your own environment.

1. **Install prerequisites**
  - Node.js 18+
  - PostgreSQL or a compatible managed cluster (Yugabyte, etc.)
  - Yarn or npm (examples below use npm)

2. **Clone the repository**
  ```bash
  git clone https://github.com/UWO-ECE-Software-Engineering/Agile-Alligators.git
  cd Agile-Alligators
  ```

3. **Install dependencies**
  ```bash
  npm install                # installs backend dependencies
  cd src/Prototypes/client && npm install
  ```

4. **Configure environment variables**
  - Copy `.env.example` from the `env/` folder to the project root as `.env`.
  - Populate database connection details, JWT secrets, API keys, and `CORS_ALLOWED_ORIGINS` (include `http://localhost:3000` for local development).
  - For the React app, create `src/Prototypes/client/.env` with `REACT_APP_API_URL=http://localhost:3001` so the UI points to the local API.

5. **Prepare the database**
  - Create the target database/schema listed in `.env`.
  - Apply any pending migrations or schema scripts from `design artifacts` / `server` resources as needed.

6. **Run the backend**
  ```bash
  npm run dev
  ```
  The API starts on `PORT` from `.env` (default `3001`). Ensure your database is reachable.

7. **Run the frontend**
  ```bash
  cd src/Prototypes/client
  npm start
  ```
  The React app runs on `http://localhost:3000` and proxies requests to the backend URL defined in step 4.

8. **Sample login**
  - Admin user: `admin@example.com`
  - Password: `Admin!123`

With both processes running, visit `http://localhost:3000` in the browser to interact with the full stack application.

