import cors from 'cors';
import express from 'express';
import { requireAdmin } from './middleware/requireAdmin.js';
import authRouter from './routes/authRoutes.js';
import studentRouter from './routes/studentRoutes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/students', studentRouter);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'school-management-api' });
});

app.get('/api/admin/profile', requireAdmin, (request, response) => {
  response.json({ admin: request.admin });
});

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});

export default app;
