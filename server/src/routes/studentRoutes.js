import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';

const studentRouter = Router();

studentRouter.post('/', requireAdmin, async (request, response) => {
  const {
    studentId,
    name,
    className,
    section,
    rollNumber,
    dateOfBirth,
    guardianPhone,
    address,
  } = request.body;

  if (!studentId || !name || !className || !section || !rollNumber || !dateOfBirth || !guardianPhone || !address) {
    return response.status(400).json({ message: 'All student fields are required.' });
  }

  try {
    const student = await Student.create({
      studentId,
      name,
      className,
      section,
      rollNumber,
      dateOfBirth,
      guardianPhone,
      address,
    });

    return response.status(201).json({ message: 'Student created.', student });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Student ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to create student.' });
  }
});

export default studentRouter;
