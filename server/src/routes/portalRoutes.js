import { Router } from 'express';
import { requireAuthenticated } from '../middleware/requireAdmin.js';
import Notice from '../models/Notice.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';

const portalRouter = Router();
portalRouter.get('/overview', requireAuthenticated, async (request, response) => {
  try {
    const audience = (request.admin.role || 'admin').replace(/^./, (letter) => letter.toUpperCase());
    const notices = await Notice.find({ $and: [{ $or: [{ audience: 'All' }, { audience }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] }] }).sort({ createdAt: -1 }).limit(5);
    let academic = null;
    if (['student', 'guardian'].includes(request.admin.role) && request.admin.linkedStudent) {
      const student = await Student.findById(request.admin.linkedStudent).lean();
      if (student) {
        const [attendance, results] = await Promise.all([Attendance.find({ student: student._id }).lean(), Result.find({ student: student._id }).sort({ createdAt: -1 }).lean()]);
        const present = attendance.filter((item) => item.status === 'Present').length;
        academic = { student, results, attendance: { present, total: attendance.length, percentage: attendance.length ? Number(((present / attendance.length) * 100).toFixed(2)) : 0 } };
      }
    }
    return response.json({ user: { name: request.admin.name, email: request.admin.email, role: request.admin.role || 'admin' }, notices, academic });
  } catch { return response.status(500).json({ message: 'Unable to load portal.' }); }
});
export default portalRouter;
