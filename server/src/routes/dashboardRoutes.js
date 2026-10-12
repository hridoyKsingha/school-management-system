import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import SchoolClass from '../models/SchoolClass.js';
import Attendance from '../models/Attendance.js';

const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAdmin, async (_request, response) => {
  try {
    const [totalStudents, totalTeachers, totalClasses, classDistribution, attendanceSummary] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      SchoolClass.countDocuments(),
      Student.aggregate([
        { $group: { _id: { className: '$className', section: '$section' }, total: { $sum: 1 } } },
        { $sort: { '_id.className': 1, '_id.section': 1 } },
      ]),
      Attendance.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]),
    ]);

    return response.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      classDistribution: classDistribution.map((item) => ({ label: `${item._id.className} - ${item._id.section}`, total: item.total })),
      attendanceSummary: Object.fromEntries(attendanceSummary.map((item) => [item._id, item.total])),
    });
  } catch {
    return response.status(500).json({ message: 'Unable to load dashboard summary.' });
  }
});

export default dashboardRouter;
