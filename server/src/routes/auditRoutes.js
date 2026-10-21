import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import AuditLog from '../models/AuditLog.js';
import { createPageMetadata, createTextSearch, parseListPage } from '../utils/listQuery.js';

const auditRouter = Router();

auditRouter.get('/', requireAdmin, async (request, response) => {
  try {
    const { page, limit, skip } = parseListPage(request.query);
    const filter = {};
    if (request.query.entity) filter.entity = request.query.entity;
    if (request.query.action) filter.action = request.query.action;
    const search = createTextSearch(['actor', 'action', 'entity', 'details'], request.query.search);
    if (search) Object.assign(filter, search);
    if (request.query.from || request.query.to) {
      filter.createdAt = {};
      if (request.query.from) filter.createdAt.$gte = new Date(`${request.query.from}T00:00:00.000Z`);
      if (request.query.to) filter.createdAt.$lte = new Date(`${request.query.to}T23:59:59.999Z`);
      if (Object.values(filter.createdAt).some((date) => Number.isNaN(date.getTime()))) {
        return response.status(400).json({ message: 'Use valid ISO dates for the audit date range.' });
      }
      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) {
        return response.status(400).json({ message: 'The start date must be on or before the end date.' });
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return response.json({ logs, pagination: createPageMetadata(page, limit, total) });
  } catch {
    return response.status(500).json({ message: 'Unable to load audit history.' });
  }
});

export default auditRouter;
