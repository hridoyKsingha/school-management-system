import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';

const attendanceRouter = Router();

attendanceRouter.get('/', requireAdmin, async (request, response) => {
  const { date, studentId } = request.query;
  const filter = {};
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    filter.date = { $gte: start, $lte: end };
  }
  if (studentId) {
    const student = await Student.findOne({ studentId });
    if (!student) return response.json({ attendance: [] });
    filter.student = student._id;
  }

  try {
    const attendance = await Attendance.find(filter).populate('student', 'studentId name className section rollNumber').sort({ date: -1, createdAt: -1 });
    return response.json({ attendance });
  } catch {
    return response.status(500).json({ message: 'Unable to load attendance.' });
  }
});

attendanceRouter.post('/mark', requireAdmin, async (request, response) => {
  const { date, records } = request.body;
  if (!date || !Array.isArray(records) || records.length === 0) {
    return response.status(400).json({ message: 'Date and attendance records are required.' });
  }
  if (records.some((record) => !record.student || !['Present', 'Absent'].includes(record.status))) {
    return response.status(400).json({ message: 'Each record must include a student and valid status.' });
  }

  try {
    const operations = records.map((record) => ({
      updateOne: {
        filter: { student: record.student, date: new Date(`${date}T00:00:00.000Z`) },
        update: { $set: { status: record.status, note: record.note || '' } },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(operations);
    return response.json({ message: 'Attendance saved successfully.', totalRecords: records.length });
  } catch {
    return response.status(500).json({ message: 'Unable to save attendance.' });
  }
});

export default attendanceRouter;
