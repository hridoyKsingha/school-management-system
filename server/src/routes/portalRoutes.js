import { Router } from 'express';
import { requireAuthenticated } from '../middleware/requireAdmin.js';
import Notice from '../models/Notice.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import Teacher from '../models/Teacher.js';
import Routine from '../models/Routine.js';
import Subject from '../models/Subject.js';

const portalRouter = Router();
portalRouter.get('/overview', requireAuthenticated, async (request, response) => {
  try {
    const audience = (request.admin.role || 'admin').replace(/^./, (letter) => letter.toUpperCase());
    const notices = await Notice.find({ $and: [{ $or: [{ audience: 'All' }, { audience }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] }] }).sort({ createdAt: -1 }).limit(5);
    let academic = null;
    let teaching = null;
    if (['student', 'guardian'].includes(request.admin.role) && request.admin.linkedStudent) {
      const student = await Student.findById(request.admin.linkedStudent).lean();
      if (student) {
        const [attendance, results, routines] = await Promise.all([Attendance.find({ student: student._id }).lean(), Result.find({ student: student._id }).sort({ createdAt: -1 }).lean(), Routine.find({ className: student.className, section: student.section }).sort({ day: 1, startTime: 1 }).lean()]);
        const present = attendance.filter((item) => item.status === 'Present').length;
        academic = { student, results, routines, attendance: { present, total: attendance.length, percentage: attendance.length ? Number(((present / attendance.length) * 100).toFixed(2)) : 0 } };
      }
    }

    if (request.admin.role === 'teacher' && request.admin.linkedTeacher) {
      const teacher = await Teacher.findById(request.admin.linkedTeacher).lean();
      if (teacher) {
        const assignment = teacher.assignedClass.trim().match(/^(.*?)(?:\s*[-/]\s*|,\s*|\s+section\s+)(?:section\s+)?([a-z0-9]+)$/i);
        const className = assignment ? assignment[1].trim() : teacher.assignedClass.trim();
        const section = assignment ? assignment[2].trim().toUpperCase() : null;
        const classFilter = { className };
        if (section) classFilter.section = section;
        const [students, routines, subjects] = await Promise.all([
          Student.find(classFilter).select('studentId name className section rollNumber photoUrl').sort({ section: 1, rollNumber: 1 }).lean(),
          Routine.find({ ...classFilter, teacher: teacher.name }).sort({ day: 1, startTime: 1 }).lean(),
          Subject.find({ className, teacher: teacher.name }).sort({ name: 1 }).lean(),
        ]);
        teaching = {
          teacher: { teacherId: teacher.teacherId, name: teacher.name, subject: teacher.subject, assignedClass: teacher.assignedClass },
          students,
          routines,
          subjects,
        };
      }
    }

    return response.json({ user: { name: request.admin.name, email: request.admin.email, role: request.admin.role || 'admin' }, notices, academic, teaching });
  } catch { return response.status(500).json({ message: 'Unable to load portal.' }); }
});
export default portalRouter;
