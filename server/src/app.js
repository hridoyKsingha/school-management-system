import cors from 'cors';
import express from 'express';
import { requireAdmin } from './middleware/requireAdmin.js';
import authRouter from './routes/authRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
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

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
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
