# To-Do List Backend (Node.js + Express + PostgreSQL)

This project is a backend API for a to-do list. It implements CRUD for tasks, a cron job that checks for newly created tasks every 5 minutes, and sends email reminders (or logs) when new tasks are found. The app is ready to be deployed to AWS (EC2 or Elastic Beanstalk).

## Features
- CRUD endpoints for tasks
- node-cron job running every 5 minutes to check new tasks
- Email notification via nodemailer (Gmail SMTP example) with fallback to console log
- Centralized error handling
# To-Do List API (Backend)

Express + PostgreSQL (Amazon RDS) backend with JWT auth, task CRUD, cron email notifications, and TLS (SSL) verification.

## Quick start (Windows PowerShell)

```powershell
cd .\backend
npm install
npm run dev
# Server runs on http://localhost:3000
```

Health check:
```powershell
Invoke-RestMethod http://localhost:3000/
# => { ok = true }
```

## Environment variables (`backend/.env`)

Required:
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE
- DB_SSL=true
- DB_SSL_CA=./ap-south-1-bundle.pem   # RDS CA bundle file placed in backend/
- JWT_SECRET=some-long-random-string
- PORT=3000

Email (optional, for cron notifications):
- EMAIL_USER, EMAIL_PASS (Gmail app password recommended)

Notes:
- Keep `.env` out of version control.
- The RDS CA file should match your region’s trust store (ap-south-1 here). We ship an example `ap-south-1-bundle.pem`. If TLS fails with `SELF_SIGNED_CERT_IN_CHAIN`, refresh the bundle for your region from AWS docs.

## Endpoints

Auth (both prefixes are supported):
- POST /auth/register and /api/auth/register
- POST /auth/login and /api/auth/login

Tasks (both prefixes are supported):
- GET    /tasks           (auth; returns only your tasks)
- POST   /tasks           (auth; creates a task owned by you)
- GET    /tasks/:id       (auth; only if owned by you)
- PUT    /tasks/:id       (auth; only if owned by you)
- DELETE /tasks/:id       (auth; only if owned by you)

Auth uses `Authorization: Bearer <JWT>`.

## Example calls (PowerShell)

Register and login:
```powershell
$reg = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register `
  -Body (@{ email='you@example.com'; password='Passw0rd!' } | ConvertTo-Json) `
  -ContentType 'application/json'

$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login `
  -Body (@{ email='you@example.com'; password='Passw0rd!' } | ConvertTo-Json) `
  -ContentType 'application/json'
$token = $login.token
```

Create / list tasks:
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body (@{ title='First task'; description='created via API' } | ConvertTo-Json) `
  -ContentType 'application/json'

Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/tasks
```

## Database & migrations

SQL migrations are in `backend/db/`:
- 001-create-tables.sql (users, tasks)
- 002-add-userid-to-tasks.sql (add tasks.user_id FK)

Apply via `psql` (example):
```powershell
psql "host=<RDS-endpoint> port=5432 dbname=todo_db user=todo_admin password=<secret> sslmode=verify-full sslrootcert=./backend/ap-south-1-bundle.pem" -f .\backend\db\001-create-tables.sql
psql "host=<RDS-endpoint> port=5432 dbname=todo_db user=todo_admin password=<secret> sslmode=verify-full sslrootcert=./backend/ap-south-1-bundle.pem" -f .\backend\db\002-add-userid-to-tasks.sql
```

## TLS diagnostics

Two small helpers for troubleshooting SSL:
- `backend/testdb.js` — runs `SELECT 1` using your `.env` (verifies CA + password)
- `backend/tls-check.js` — raw TLS handshake; prints cert subject/issuer and authorization status

Run:
```powershell
node .\backend\testdb.js
node .\backend\tls-check.js
```

## Cron email notifications

- Runs every 5 minutes (see `src/jobs/checkNewTasks.js`).
- Sends an email to each task owner (grouped by `users.email`) for tasks created in the last 5 minutes.
- Ensure `EMAIL_USER`/`EMAIL_PASS` are valid and app-passwords are enabled if using Gmail.

## Troubleshooting

- `SELF_SIGNED_CERT_IN_CHAIN` during DB connect: refresh the RDS CA bundle for your region; ensure `DB_SSL=true` and `DB_SSL_CA` points to that PEM; restart the server.
- `password authentication failed`: confirm `.env` DB_PASSWORD matches RDS user; restart process; try `node backend/testdb.js`.
- `Unable to connect to the remote server` when calling API: ensure server is running on port 3000 (see logs) and you’re calling `http://localhost:3000`.

## Notes
- Public listing endpoints exist for quick testing; tighten as needed for production.
- Avoid committing secrets; use environment variables or secret managers in production.

## Hosting on AWS (two easy options)

Option A — AWS App Runner (with the Dockerfile included)
1. Push this repo to GitHub.
2. In AWS Console, open App Runner → Create service → From source code repository.
3. Connect your GitHub repo, select the `backend/` folder and Dockerfile.
4. Runtime: use the Docker build the service detects. Set environment variables:
  - PORT=3000
  - DB_* (host, port, user, password, database)
  - DB_SSL=true, DB_SSL_CA content mounted via a secret or point the container at a mounted file.
  - JWT_SECRET, EMAIL_USER, EMAIL_PASS
5. Create the service; App Runner will build and run the container and give you a public URL.

Option B — Elastic Beanstalk (Node.js platform)
1. Zip the `backend/` directory contents and upload as a new application version in EB (Node.js platform).
2. EB sets PORT automatically; our server respects `process.env.PORT`.
3. Configure environment variables in EB console (same as above DB_*, JWT_SECRET, EMAIL_*).
4. Deploy; EB will provide a public URL.

Postman (hosted)
- Import `backend/postman/todo.postman_collection.json` and `backend/postman/todo.postman_environment.json`.
- Set baseUrl to your public URL (e.g., `https://<apprunner-id>.<region>.awsapprunner.com`).
- Run Register → Login → set `jwt` → CRUD requests. For cron, create a task and wait up to 5 minutes; check inbox/logs.

## CI/CD: Build to ECR and deploy to EC2 (GitHub Actions)

We included two workflows:

- `.github/workflows/ecr-push.yml` — builds the Docker image from `backend/` and pushes to Amazon ECR on push to `main` or manual dispatch.
- `.github/workflows/deploy-ec2-ssm.yml` — pulls the image on an EC2 instance (via AWS SSM), writes an env file from GitHub Secrets, downloads the region RDS CA bundle, and runs the container on port 80.

Required GitHub repository secrets:
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
- EC2_INSTANCE_ID
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE
- JWT_SECRET
- Optional: EMAIL_USER, EMAIL_PASS

How to use:
1. Set the secrets above in your GitHub repository settings.
2. Run “Build and Push Docker image to ECR” (manually or push to main).
3. Run “Deploy container to EC2 via SSM” with `imageTag=latest` (or a specific SHA).
4. Visit `http://<EC2_PUBLIC_IP>/` and test with Postman.
