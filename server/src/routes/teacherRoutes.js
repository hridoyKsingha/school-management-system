import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Teacher from '../models/Teacher.js';

const teacherRouter = Router();

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

export default teacherRouter;
