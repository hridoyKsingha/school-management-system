import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Teacher from '../models/Teacher.js';
import { createNotification } from '../utils/notifications.js';
import { writeAudit } from '../utils/audit.js';
import { createPageMetadata, createTextSearch, parseListPage } from '../utils/listQuery.js';
import Admin from '../models/Admin.js';

const teacherRouter = Router();

teacherRouter.get('/', requireAdmin, async (request, response) => {
  try {
    const filter = {};
    const search = createTextSearch(['name', 'teacherId', 'subject', 'assignedClass'], request.query.search);
    if (search) Object.assign(filter, search);
    if (request.query.subject?.trim()) filter.subject = request.query.subject.trim();
    if (request.query.assignedClass?.trim()) filter.assignedClass = request.query.assignedClass.trim();

    if (request.query.page || request.query.limit) {
      const { page, limit, skip } = parseListPage(request.query);
      const [teachers, total] = await Promise.all([
        Teacher.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Teacher.countDocuments(filter),
      ]);
      return response.json({ teachers, pagination: createPageMetadata(page, limit, total) });
    }

    return response.json({ teachers: await Teacher.find(filter).sort({ createdAt: -1 }) });
  } catch {
    return response.status(500).json({ message: 'Unable to load teachers.' });
  }
});

teacherRouter.post('/', requireAdmin, async (request, response) => {
  const { teacherId, name, subject, assignedClass, phone, photoUrl } = request.body;

  if (!teacherId || !name || !subject || !assignedClass || !phone) {
    return response.status(400).json({ message: 'All teacher fields are required.' });
  }

  try {
    const teacher = await Teacher.create({ teacherId, name, subject, assignedClass, phone, photoUrl: photoUrl || '' });
    await writeAudit(request, 'Created', 'Teacher', `${teacher.teacherId} — ${teacher.name}`);
    await createNotification('Teacher added', `${teacher.name} was added to the teacher records.`, 'success');
    return response.status(201).json({ message: 'Teacher created.', teacher });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'Teacher ID already exists.' });
    }

    return response.status(500).json({ message: 'Unable to create teacher.' });
  }
});

teacherRouter.put('/:id', requireAdmin, async (request, response) => {
  const { teacherId, name, subject, assignedClass, phone, photoUrl } = request.body;

  if (!teacherId || !name || !subject || !assignedClass || !phone) {
    return response.status(400).json({ message: 'All teacher fields are required.' });
  }

  try {
    const teacher = await Teacher.findByIdAndUpdate(
      request.params.id,
      { teacherId, name, subject, assignedClass, phone, photoUrl: photoUrl || '' },
      { new: true, runValidators: true },
    );

    if (!teacher) {
      return response.status(404).json({ message: 'Teacher not found.' });
    }

    await writeAudit(request, 'Updated', 'Teacher', `${teacher.teacherId} — ${teacher.name}`);
    await createNotification('Teacher record updated', `${teacher.name}'s teacher record was updated.`, 'info');

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
    if (await Admin.exists({ linkedTeacher: request.params.id })) {
      return response.status(409).json({ message: 'Delete the linked teacher login account first, then remove this teacher record.' });
    }
    const teacher = await Teacher.findByIdAndDelete(request.params.id);

    if (!teacher) {
      return response.status(404).json({ message: 'Teacher not found.' });
    }

    await writeAudit(request, 'Deleted', 'Teacher', `${teacher.teacherId} — ${teacher.name}`);
    await createNotification('Teacher record deleted', `${teacher.name} was removed from the teacher records.`, 'warning');

    return response.json({ message: 'Teacher deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete teacher.' });
  }
});

export default teacherRouter;
