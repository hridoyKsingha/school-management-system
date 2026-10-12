import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Student from '../models/Student.js';
import { createNotification } from '../utils/notifications.js';
import { writeAudit } from '../utils/audit.js';

const promotionRouter = Router();
promotionRouter.post('/', requireAdmin, async (request, response) => {
  const { studentIds, className, section } = request.body;
  if (!Array.isArray(studentIds) || !studentIds.length || !className?.trim() || !section?.trim()) return response.status(400).json({ message: 'Select students and enter the next class and section.' });
  try {
    const result = await Student.updateMany({ _id: { $in: studentIds } }, { $set: { className: className.trim(), section: section.trim().toUpperCase() } });
    await writeAudit(request, 'Promoted', 'Students', `${result.modifiedCount} student(s) → ${className}-${section}`);
    await createNotification('Student promotion completed', `${result.modifiedCount} student(s) moved to ${className}-${section}.`, 'success');
    return response.json({ message: `${result.modifiedCount} student(s) promoted successfully.`, total: result.modifiedCount });
  } catch { return response.status(500).json({ message: 'Unable to promote students.' }); }
});
export default promotionRouter;
