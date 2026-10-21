import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Subject from '../models/Subject.js';
import { createNotification } from '../utils/notifications.js';
import { writeAudit } from '../utils/audit.js';

const subjectRouter = Router();
subjectRouter.get('/', requireAdmin, async (_request, response) => { try { return response.json({ subjects: await Subject.find().sort({ className: 1, name: 1 }) }); } catch { return response.status(500).json({ message: 'Unable to load subjects.' }); } });
subjectRouter.post('/', requireAdmin, async (request, response) => {
  const { name, code, className, teacher = '', fullMarks = 100 } = request.body;
  if (!name?.trim() || !code?.trim() || !className?.trim()) return response.status(400).json({ message: 'Name, code, and class are required.' });
  try { const subject = await Subject.create({ name, code, className, teacher, fullMarks }); await writeAudit(request, 'Created', 'Subject', `${subject.code} — ${subject.name}`); await createNotification('Subject added', `${subject.name} was added for ${subject.className}.`, 'success'); return response.status(201).json({ message: 'Subject created.', subject }); }
  catch (error) { return response.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'This subject code already exists for the class.' : 'Unable to create subject.' }); }
});
subjectRouter.put('/:id', requireAdmin, async (request, response) => {
  const { name, code, className, teacher = '', fullMarks = 100 } = request.body;
  if (!name?.trim() || !code?.trim() || !className?.trim()) return response.status(400).json({ message: 'Name, code, and class are required.' });
  try {
    const subject = await Subject.findByIdAndUpdate(request.params.id, { name, code, className, teacher, fullMarks }, { new: true, runValidators: true });
    if (!subject) return response.status(404).json({ message: 'Subject not found.' });
    await writeAudit(request, 'Updated', 'Subject', subject.code);
    return response.json({ message: 'Subject updated.', subject });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'This subject code already exists for the class.' });
    if (error.name === 'ValidationError') return response.status(400).json({ message: 'Check the subject values and full marks.' });
    return response.status(500).json({ message: 'Unable to update subject.' });
  }
});
subjectRouter.delete('/:id', requireAdmin, async (request, response) => { try { const subject = await Subject.findByIdAndDelete(request.params.id); if (!subject) return response.status(404).json({ message: 'Subject not found.' }); await writeAudit(request, 'Deleted', 'Subject', subject.code); return response.json({ message: 'Subject deleted.' }); } catch { return response.status(500).json({ message: 'Unable to delete subject.' }); } });
export default subjectRouter;
