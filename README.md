# School Management System

A MERN-stack record management platform for school administrators. It securely manages student and teacher information through a single web dashboard.

## Live website

https://school-management-system-client-livid.vercel.app

## Completed features

- Administrator registration and JWT login
- Protected dashboard with student, teacher, and class totals
- Student records: create, view, edit, delete, and search
- Teacher records: create, view, edit, delete, and search
- Empty-state feedback and dashboard refresh
- MongoDB Atlas database and Vercel deployment

## Technology used

- Frontend: React, Vite, CSS
- Backend: Node.js, Express, Mongoose
- Database: MongoDB Atlas
- Authentication: JWT and bcrypt
- Hosting: Vercel

## Project structure

```text
client/  React + Vite frontend
server/  Express API, models, middleware, routes
api/     Vercel serverless API handlers
```

## Run locally

1. Install dependencies from the project root:

   ```powershell
   pnpm install
   ```

2. Create `server/.env` using this format. Never commit this file.

   ```text
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_long_random_secret
   CLIENT_URL=http://localhost:5173
   ```

3. Start the API in one terminal:

   ```powershell
   cd server
   node src/index.js
   ```

4. Start the frontend in another terminal:

   ```powershell
   cd client
   .\node_modules\.bin\vite.cmd
   ```

5. Open http://localhost:5173.

## API routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | API health check |
| `POST /api/auth/register` | Create the first administrator |
| `POST /api/auth/login` | Administrator login |
| `GET /api/dashboard/summary` | Dashboard totals |
| `/api/students` | Student CRUD operations |
| `/api/teachers` | Teacher CRUD operations |

Except health, registration, and login, API routes require an administrator JWT token.

## Deployment configuration

The project is deployed from the repository root on Vercel. Add these Vercel environment variables for Production and Preview:

```text
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=https://school-management-system-client-livid.vercel.app
```

MongoDB Atlas must allow the Vercel deployment to connect. Do not store database passwords or JWT secrets in GitHub.

## Submission test checklist

- Login and sign out work.
- Dashboard shows correct totals and refreshes.
- Student and teacher records can be added, edited, searched, and deleted.
- Live API health check works at `/api/health`.
- Take screenshots of login, dashboard, student page, teacher page, and the deployed Vercel site for submission.
