import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from './middleware/requireAdmin.js';
import authRouter from './routes/authRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import auditRouter from './routes/auditRoutes.js';
import classRouter from './routes/classRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import resultRouter from './routes/resultRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import noticeRouter from './routes/noticeRoutes.js';
import portalRouter from './routes/portalRoutes.js';
import promotionRouter from './routes/promotionRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import routineRouter from './routes/routineRoutes.js';
import subjectRouter from './routes/subjectRoutes.js';
import studentRouter from './routes/studentRoutes.js';
import teacherRouter from './routes/teacherRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Non-browser clients such as Postman do not send an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('This origin is not allowed by the API CORS policy.'));
  },
}));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/classes', classRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/results', resultRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/notices', noticeRouter);
app.use('/api/portal', portalRouter);
app.use('/api/promotions', promotionRouter);
app.use('/api/reports', reportRouter);
app.use('/api/routines', routineRouter);
app.use('/api/subjects', subjectRouter);
app.use('/api/students', studentRouter);
app.use('/api/teachers', teacherRouter);
app.use('/api/uploads', uploadRouter);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'school-management-api' });
});

app.get('/api/admin/profile', requireAdmin, (request, response) => {
  response.json({ admin: { ...request.admin.toObject(), role: request.admin.role || 'admin' } });
});

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});

export default app;
