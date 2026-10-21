import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import { createNotification } from '../utils/notifications.js';
import { writeAudit } from '../utils/audit.js';
import { createPageMetadata, createTextSearch, parseListPage } from '../utils/listQuery.js';
import Admin from '../models/Admin.js';

const studentRouter = Router();

studentRouter.get('/', requireAdmin, async (request, response) => {
  try {
    const filter = {};
    const search = createTextSearch(['name', 'studentId'], request.query.search);
    if (search) Object.assign(filter, search);
    if (request.query.className?.trim()) filter.className = request.query.className.trim();
    if (request.query.section?.trim()) filter.section = request.query.section.trim().toUpperCase();

    if (request.query.page || request.query.limit) {
      const { page, limit, skip } = parseListPage(request.query);
      const [students, total] = await Promise.all([
        Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Student.countDocuments(filter),
      ]);
      return response.json({ students, pagination: createPageMetadata(page, limit, total) });
    }

    return response.json({ students: await Student.find(filter).sort({ createdAt: -1 }) });
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
    photoUrl,
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
      photoUrl: photoUrl || '',
    });
    await writeAudit(request, 'Created', 'Student', `${student.studentId} — ${student.name}`);
    await createNotification('Student added', `${student.name} was added to the student records.`, 'success');

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
    photoUrl,
  } = request.body;

  if (!studentId || !name || !className || !section || !rollNumber || !dateOfBirth || !guardianPhone || !address) {
    return response.status(400).json({ message: 'All student fields are required.' });
  }

  try {
    const student = await Student.findByIdAndUpdate(
      request.params.id,
      { studentId, name, className, section, rollNumber, dateOfBirth, guardianPhone, address, photoUrl: photoUrl || '' },
      { new: true, runValidators: true },
    );

    if (!student) {
      return response.status(404).json({ message: 'Student not found.' });
    }

    await writeAudit(request, 'Updated', 'Student', `${student.studentId} — ${student.name}`);
    await createNotification('Student record updated', `${student.name}'s student record was updated.`, 'info');

    return response.json({ message: 'Student updated.', student });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Student ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to update student.' });
  }
});

studentRouter.delete('/:id', requireAdmin, async (request, response) => {
  try {
    if (await Admin.exists({ linkedStudent: request.params.id })) {
      return response.status(409).json({ message: 'Delete the student or guardian login account first, then remove this student record.' });
    }
    const student = await Student.findByIdAndDelete(request.params.id);

    if (!student) {
      return response.status(404).json({ message: 'Student not found.' });
    }

    await writeAudit(request, 'Deleted', 'Student', `${student.studentId} — ${student.name}`);
    await createNotification('Student record deleted', `${student.name} was removed from the student records.`, 'warning');

    return response.json({ message: 'Student deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete student.' });
  }
});

export default studentRouter;
