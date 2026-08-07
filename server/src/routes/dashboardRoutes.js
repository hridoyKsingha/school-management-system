import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';

const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAdmin, async (_request, response) => {
  try {
    const [totalStudents, totalTeachers, classes] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Student.distinct('className'),
    ]);

    return response.json({
      totalStudents,
      totalTeachers,
      totalClasses: classes.length,
    });
  } catch {
    return response.status(500).json({ message: 'Unable to load dashboard summary.' });
  }
});

export default dashboardRouter;
