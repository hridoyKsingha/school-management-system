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

export default notificationRouter;
