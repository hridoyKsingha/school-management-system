import bcrypt from 'bcryptjs';
import { Router } from 'express';
import Admin from '../models/Admin.js';

const authRouter = Router();

authRouter.post('/register', async (request, response) => {
  const { name, email, password } = request.body;

  if (!name?.trim() || !email?.trim() || !password) {
    return response.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (password.length < 8) {
    return response.status(400).json({ message: 'Password must contain at least 8 characters.' });
  }

  try {
    const hasAdmin = await Admin.exists({});

    if (hasAdmin) {
      return response.status(403).json({ message: 'Administrator registration is disabled.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: passwordHash,
    });

    return response.status(201).json({
      message: 'Administrator account created.',
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'An administrator with this email already exists.' });
    }

    return response.status(500).json({ message: 'Unable to create administrator account.' });
  }
});

export default authRouter;
