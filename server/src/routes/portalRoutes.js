import { Router } from 'express';
import { requireAuthenticated } from '../middleware/requireAdmin.js';
import Notice from '../models/Notice.js';

const portalRouter = Router();
portalRouter.get('/overview', requireAuthenticated, async (request, response) => {
  try {
    const audience = (request.admin.role || 'admin').replace(/^./, (letter) => letter.toUpperCase());
    const notices = await Notice.find({ $and: [{ $or: [{ audience: 'All' }, { audience }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] }] }).sort({ createdAt: -1 }).limit(5);
    return response.json({ user: { name: request.admin.name, email: request.admin.email, role: request.admin.role || 'admin' }, notices });
  } catch { return response.status(500).json({ message: 'Unable to load portal.' }); }
});
export default portalRouter;
