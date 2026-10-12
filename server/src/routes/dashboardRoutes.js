import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import SchoolClass from '../models/SchoolClass.js';

const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAdmin, async (_request, response) => {
  try {
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      SchoolClass.countDocuments(),
    ]);

    return response.json({
      totalStudents,
      totalTeachers,
      totalClasses,
    });
  } catch {
    return response.status(500).json({ message: 'Unable to load dashboard summary.' });
  }
});

export default dashboardRouter;
