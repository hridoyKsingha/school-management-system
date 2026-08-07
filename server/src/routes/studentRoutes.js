import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';

const studentRouter = Router();

studentRouter.get('/', requireAdmin, async (_request, response) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    return response.json({ students });
  } catch {
    return response.status(500).json({ message: 'Unable to load students.' });
  }
});

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

studentRouter.put('/:id', requireAdmin, async (request, response) => {
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
    const student = await Student.findByIdAndUpdate(
      request.params.id,
      { studentId, name, className, section, rollNumber, dateOfBirth, guardianPhone, address },
      { new: true, runValidators: true },
    );

    if (!student) {
      return response.status(404).json({ message: 'Student not found.' });
    }

    return response.json({ message: 'Student updated.', student });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Student ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to update student.' });
  }
});

export default studentRouter;
