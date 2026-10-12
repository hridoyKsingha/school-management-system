import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Result from '../models/Result.js';
import Student from '../models/Student.js';
import { createNotification } from '../utils/notifications.js';

const resultRouter = Router();

function calculateGrade(obtainedMarks, fullMarks) {
  const percentage = Number(((obtainedMarks / fullMarks) * 100).toFixed(2));
  if (percentage >= 80) return { percentage, grade: 'A+' };
  if (percentage >= 70) return { percentage, grade: 'A' };
  if (percentage >= 60) return { percentage, grade: 'A-' };
  if (percentage >= 50) return { percentage, grade: 'B' };
  if (percentage >= 40) return { percentage, grade: 'C' };
  if (percentage >= 33) return { percentage, grade: 'D' };
  return { percentage, grade: 'F' };
}

resultRouter.get('/', requireAdmin, async (request, response) => {
  try {
    const filter = {};
    if (request.query.studentId) {
      const student = await Student.findOne({ studentId: request.query.studentId });
      if (!student) return response.json({ results: [] });
      filter.student = student._id;
    }
    const results = await Result.find(filter).populate('student', 'studentId name className section rollNumber').sort({ createdAt: -1 });
    return response.json({ results });
  } catch {
    return response.status(500).json({ message: 'Unable to load results.' });
  }
});

resultRouter.post('/', requireAdmin, async (request, response) => {
  const { student, subject, examType = 'Final', fullMarks, obtainedMarks } = request.body;
  if (!student || !subject?.trim() || fullMarks === undefined || obtainedMarks === undefined) {
    return response.status(400).json({ message: 'Student, subject, full marks, and obtained marks are required.' });
  }
  if (Number(obtainedMarks) > Number(fullMarks)) return response.status(400).json({ message: 'Obtained marks cannot exceed full marks.' });
  const { percentage, grade } = calculateGrade(Number(obtainedMarks), Number(fullMarks));
  try {
    const result = await Result.create({ student, subject, examType, fullMarks, obtainedMarks, percentage, grade });
    await createNotification('Result published', `${subject} ${examType} result was recorded.`, 'success');
    await result.populate('student', 'studentId name className section rollNumber');
    return response.status(201).json({ message: 'Result created.', result });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'A result for this subject and exam already exists.' });
    return response.status(500).json({ message: 'Unable to create result.' });
  }
});

resultRouter.put('/:id', requireAdmin, async (request, response) => {
  const { student, subject, examType = 'Final', fullMarks, obtainedMarks } = request.body;
  if (!student || !subject?.trim() || fullMarks === undefined || obtainedMarks === undefined) return response.status(400).json({ message: 'All result fields are required.' });
  if (Number(obtainedMarks) > Number(fullMarks)) return response.status(400).json({ message: 'Obtained marks cannot exceed full marks.' });
  const { percentage, grade } = calculateGrade(Number(obtainedMarks), Number(fullMarks));
  try {
    const result = await Result.findByIdAndUpdate(request.params.id, { student, subject, examType, fullMarks, obtainedMarks, percentage, grade }, { new: true, runValidators: true }).populate('student', 'studentId name className section rollNumber');
    if (!result) return response.status(404).json({ message: 'Result not found.' });
    return response.json({ message: 'Result updated.', result });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'A result for this subject and exam already exists.' });
    return response.status(500).json({ message: 'Unable to update result.' });
  }
});

resultRouter.delete('/:id', requireAdmin, async (request, response) => {
  try {
    const result = await Result.findByIdAndDelete(request.params.id);
    if (!result) return response.status(404).json({ message: 'Result not found.' });
    return response.json({ message: 'Result deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete result.' });
  }
});

export default resultRouter;
