import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Notification from '../models/Notification.js';

const notificationRouter = Router();

notificationRouter.get('/', requireAdmin, async (_request, response) => {
  try { return response.json({ notifications: await Notification.find().sort({ createdAt: -1 }).limit(12) }); }
  catch { return response.status(500).json({ message: 'Unable to load notifications.' }); }
});

notificationRouter.put('/read-all', requireAdmin, async (_request, response) => {
  try { await Notification.updateMany({ isRead: false }, { isRead: true }); return response.json({ message: 'Notifications marked as read.' }); }
  catch { return response.status(500).json({ message: 'Unable to update notifications.' }); }
});

notificationRouter.put('/:id/read', requireAdmin, async (request, response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(request.params.id, { isRead: true }, { new: true });
    if (!notification) return response.status(404).json({ message: 'Notification not found.' });
    return response.json({ message: 'Notification marked as read.', notification });
  } catch {
    return response.status(500).json({ message: 'Unable to update notification.' });
  }
});

export default notificationRouter;
