import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import Result from '../models/Result.js';
import Attendance from '../models/Attendance.js';

const reportRouter = Router();
reportRouter.get('/report-card/:studentId', requireAdmin, async (request, response) => {
  try {
    const student = await Student.findOne({ studentId: request.params.studentId });
    if (!student) return response.status(404).json({ message: 'Student not found.' });
    const [results, attendance] = await Promise.all([Result.find({ student: student._id }).sort({ subject: 1 }).lean(), Attendance.find({ student: student._id }).lean()]);
    const present = attendance.filter((entry) => entry.status === 'Present').length;
    const average = results.length ? Number((results.reduce((sum, item) => sum + item.percentage, 0) / results.length).toFixed(2)) : 0;
    return response.json({ student, results, summary: { subjects: results.length, average, attendance: { present, total: attendance.length, percentage: attendance.length ? Number(((present / attendance.length) * 100).toFixed(2)) : 0 } } });
  } catch { return response.status(500).json({ message: 'Unable to build report card.' }); }
});
export default reportRouter;
