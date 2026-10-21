import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import SchoolClass from '../models/SchoolClass.js';
import { writeAudit } from '../utils/audit.js';
import Student from '../models/Student.js';
import Routine from '../models/Routine.js';
import { createNotification } from '../utils/notifications.js';

const classRouter = Router();

classRouter.get('/', requireAdmin, async (_request, response) => {
  try {
    const classes = await SchoolClass.find().sort({ className: 1, section: 1 });
    return response.json({ classes });
  } catch {
    return response.status(500).json({ message: 'Unable to load classes.' });
  }
});

classRouter.post('/', requireAdmin, async (request, response) => {
  const { className, section, classTeacher = '', roomNumber = '' } = request.body;

  if (!className || !section) {
    return response.status(400).json({ message: 'Class name and section are required.' });
  }

  try {
    const schoolClass = await SchoolClass.create({ className, section, classTeacher, roomNumber });
    await writeAudit(request, 'Created', 'Class', `${schoolClass.className}-${schoolClass.section}`);
    await createNotification('Class created', `${schoolClass.className}-${schoolClass.section} was added.`, 'success');
    return response.status(201).json({ message: 'Class created.', schoolClass });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'This class and section already exist.' });
    }

    return response.status(500).json({ message: 'Unable to create class.' });
  }
});

classRouter.put('/:id', requireAdmin, async (request, response) => {
  const { className, section, classTeacher = '', roomNumber = '' } = request.body;

  if (!className || !section) {
    return response.status(400).json({ message: 'Class name and section are required.' });
  }

  try {
    const schoolClass = await SchoolClass.findByIdAndUpdate(
      request.params.id,
      { className, section, classTeacher, roomNumber },
      { new: true, runValidators: true },
    );

    if (!schoolClass) return response.status(404).json({ message: 'Class not found.' });
    await writeAudit(request, 'Updated', 'Class', `${schoolClass.className}-${schoolClass.section}`);
    await createNotification('Class updated', `${schoolClass.className}-${schoolClass.section} was updated.`, 'info');
    return response.json({ message: 'Class updated.', schoolClass });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'This class and section already exist.' });
    return response.status(500).json({ message: 'Unable to update class.' });
  }
});

classRouter.delete('/:id', requireAdmin, async (request, response) => {
  try {
    const currentClass = await SchoolClass.findById(request.params.id);
    if (!currentClass) return response.status(404).json({ message: 'Class not found.' });
    const hasRecords = await Promise.all([
      Student.exists({ className: currentClass.className, section: currentClass.section }),
      Routine.exists({ className: currentClass.className, section: currentClass.section }),
    ]);
    if (hasRecords.some(Boolean)) return response.status(409).json({ message: 'This class still has student or routine records. Move or remove those records before deleting it.' });
    const schoolClass = await SchoolClass.findByIdAndDelete(request.params.id);
    if (!schoolClass) return response.status(404).json({ message: 'Class not found.' });
    await writeAudit(request, 'Deleted', 'Class', `${schoolClass.className}-${schoolClass.section}`);
    await createNotification('Class deleted', `${schoolClass.className}-${schoolClass.section} was removed.`, 'warning');
    return response.json({ message: 'Class deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete class.' });
  }
});

export default classRouter;
