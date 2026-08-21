import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import SchoolClass from '../models/SchoolClass.js';

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
  const { className, section } = request.body;

  if (!className || !section) {
    return response.status(400).json({ message: 'Class name and section are required.' });
  }

  try {
    const schoolClass = await SchoolClass.create({ className, section });
    return response.status(201).json({ message: 'Class created.', schoolClass });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'This class and section already exist.' });
    }

    return response.status(500).json({ message: 'Unable to create class.' });
  }
});

export default classRouter;
