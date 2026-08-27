# School Management System

<p align="center">
  <strong>A MERN Stack Student and Teacher Record Management Platform</strong><br />
  A secure, responsive workspace for school administrators to manage academic records efficiently.
</p>

<p align="center">
  <a href="https://school-management-system-client-livid.vercel.app">Live Demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#run-locally">Local Setup</a> ·
  <a href="#api-overview">API</a>
</p>

<p align="center">
  <img src="assets/project-preview.png" alt="School Management System login screen" width="900" />
</p>

## Overview

School Management System is a full-stack web application built for school administrators. It provides authenticated access to a dashboard and makes student and teacher record management simple, organized, and secure.

**Live site:** [school-management-system-client-livid.vercel.app](https://school-management-system-client-livid.vercel.app)

## Features

- Secure administrator registration and login using JWT
- Protected administrator dashboard with live summary totals
- Student management: create, view, update, delete, and search records
- Teacher management: create, view, update, delete, and search records
- Clear empty states, confirmation before deleting, and manual dashboard refresh
- Persistent cloud database with MongoDB Atlas
- Production deployment on Vercel

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas with Mongoose |
| Authentication | JSON Web Token (JWT), bcrypt |
| Deployment | Vercel Serverless Functions |

## Project Structure

```text
school-management-system/
├── client/        # React + Vite frontend
├── server/        # Express API, routes, models, middleware
├── api/           # Vercel serverless route handlers
└── assets/        # README project preview image
```

## Run Locally

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Configure environment variables

Create `server/.env`:

```text
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
```

> Never commit `.env`, database credentials, or JWT secrets.

### 3. Start the backend

```powershell
cd server
node src/index.js
```

### 4. Start the frontend

Open another terminal:

```powershell
cd client
.\node_modules\.bin\vite.cmd
```

Open [http://localhost:5173](http://localhost:5173).

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| POST | `/api/auth/register` | Create the first administrator account |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/dashboard/summary` | Get dashboard totals |
| GET/POST/PUT/DELETE | `/api/students` | Manage student records |
| GET/POST/PUT/DELETE | `/api/teachers` | Manage teacher records |

All record-management routes require a valid administrator JWT token.

## Deployment

The app is deployed on Vercel from the repository root. Configure these variables in Vercel for **Production** and **Preview**:

```text
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=https://school-management-system-client-livid.vercel.app
```

For Vercel connectivity, MongoDB Atlas must permit the deployment's network access.

## Testing Checklist

- [x] Administrator login and sign out
- [x] Dashboard statistics and refresh
- [x] Student CRUD and search
- [x] Teacher CRUD and search
- [x] MongoDB Atlas persistence
- [x] Vercel deployment and `/api/health` check

## Project Status

The core proposal scope is complete and deployed. Future enhancements—such as dedicated class/section management, attendance, subjects, and results—can be added in later versions.

---

Developed as a university Web Programming Lab project.
