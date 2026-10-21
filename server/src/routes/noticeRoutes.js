import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Notice from '../models/Notice.js';
import { createNotification } from '../utils/notifications.js';
import { writeAudit } from '../utils/audit.js';

const noticeRouter = Router();
const activeFilter = { $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] };

noticeRouter.get('/public', async (_request, response) => { try { return response.json({ notices: await Notice.find({ $and: [{ audience: 'All' }, activeFilter] }).sort({ priority: -1, publishedAt: -1 }).limit(5) }); } catch { return response.status(500).json({ message: 'Unable to load notices.' }); } });
noticeRouter.get('/', requireAdmin, async (_request, response) => { try { return response.json({ notices: await Notice.find().sort({ createdAt: -1 }) }); } catch { return response.status(500).json({ message: 'Unable to load notices.' }); } });
noticeRouter.post('/', requireAdmin, async (request, response) => { const { title, body, audience = 'All', priority = 'Normal', expiresAt = null } = request.body; if (!title?.trim() || !body?.trim()) return response.status(400).json({ message: 'Notice title and details are required.' }); try { const notice = await Notice.create({ title, body, audience, priority, expiresAt: expiresAt || null }); await writeAudit(request, 'Published', 'Notice', notice.title); await createNotification('New notice published', notice.title, priority === 'Urgent' ? 'warning' : 'info'); return response.status(201).json({ message: 'Notice published.', notice }); } catch (error) { return response.status(error.name === 'ValidationError' ? 400 : 500).json({ message: error.name === 'ValidationError' ? 'Check the audience, priority, and expiry date.' : 'Unable to publish notice.' }); } });
noticeRouter.put('/:id', requireAdmin, async (request, response) => {
  const { title, body, audience = 'All', priority = 'Normal', expiresAt = null } = request.body;
  if (!title?.trim() || !body?.trim()) return response.status(400).json({ message: 'Notice title and details are required.' });
  try {
    const notice = await Notice.findByIdAndUpdate(request.params.id, { title, body, audience, priority, expiresAt: expiresAt || null }, { new: true, runValidators: true });
    if (!notice) return response.status(404).json({ message: 'Notice not found.' });
    await writeAudit(request, 'Updated', 'Notice', notice.title);
    return response.json({ message: 'Notice updated.', notice });
  } catch (error) {
    if (error.name === 'ValidationError') return response.status(400).json({ message: 'Check the audience, priority, and expiry date.' });
    return response.status(500).json({ message: 'Unable to update notice.' });
  }
});
noticeRouter.delete('/:id', requireAdmin, async (request, response) => { try { const notice = await Notice.findByIdAndDelete(request.params.id); if (!notice) return response.status(404).json({ message: 'Notice not found.' }); await writeAudit(request, 'Deleted', 'Notice', notice.title); return response.json({ message: 'Notice deleted.' }); } catch { return response.status(500).json({ message: 'Unable to delete notice.' }); } });
export default noticeRouter;
