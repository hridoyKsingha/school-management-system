import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Teacher from '../models/Teacher.js';

const teacherRouter = Router();

teacherRouter.get('/', requireAdmin, async (_request, response) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    return response.json({ teachers });
  } catch {
    return response.status(500).json({ message: 'Unable to load teachers.' });
  }
});

teacherRouter.post('/', requireAdmin, async (request, response) => {
  const { teacherId, name, subject, assignedClass, phone } = request.body;

  if (!teacherId || !name || !subject || !assignedClass || !phone) {
    return response.status(400).json({ message: 'All teacher fields are required.' });
  }

  try {
    const teacher = await Teacher.create({ teacherId, name, subject, assignedClass, phone });
    return response.status(201).json({ message: 'Teacher created.', teacher });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Teacher ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to create teacher.' });
  }
});

teacherRouter.put('/:id', requireAdmin, async (request, response) => {
  const { teacherId, name, subject, assignedClass, phone } = request.body;

  if (!teacherId || !name || !subject || !assignedClass || !phone) {
    return response.status(400).json({ message: 'All teacher fields are required.' });
  }

  try {
    const teacher = await Teacher.findByIdAndUpdate(
      request.params.id,
      { teacherId, name, subject, assignedClass, phone },
      { new: true, runValidators: true },
    );

    if (!teacher) {
      return response.status(404).json({ message: 'Teacher not found.' });
    }

    return response.json({ message: 'Teacher updated.', teacher });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Teacher ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to update teacher.' });
  }
});

teacherRouter.delete('/:id', requireAdmin, async (request, response) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(request.params.id);

    if (!teacher) {
      return response.status(404).json({ message: 'Teacher not found.' });
    }

    return response.json({ message: 'Teacher deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete teacher.' });
  }
});

export default teacherRouter;
