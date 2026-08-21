# School Management System

A MERN-stack platform for school administrators to securely manage student and teacher records.

## Planned modules

- JWT-protected administrator login
- Dashboard statistics
- Student record management
- Teacher record management
- MongoDB Atlas persistence
- Vercel deployment

## Project structure

```text
client/  React + Vite frontend
server/  Express REST API
```

## Local development

1. Copy `server/.env.example` to `server/.env` when the backend configuration milestone is complete.
2. Run `pnpm install`.
3. Run `pnpm dev` to start both applications.

The client will run on `http://localhost:5173`, and the API will run on `http://localhost:5000`.

## Vercel deployment

Deploy this repository from its root directory. Add these environment variables in the Vercel project settings:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<your long random secret>
CLIENT_URL=<your Vercel deployment URL>
```

Vercel builds the React client and serves the Express API as a serverless function under `/api`.
