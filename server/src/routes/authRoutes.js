import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireAdmin } from '../middleware/requireAdmin.js';
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

authRouter.post('/login', async (request, response) => {
  const { email, password } = request.body;

  if (!email?.trim() || !password) {
    return response.status(400).json({ message: 'Email and password are required.' });
  }

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({ message: 'JWT_SECRET is not configured.' });
  }

  try {
    const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const passwordMatches = admin && await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return response.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return response.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch {
    return response.status(500).json({ message: 'Unable to sign in.' });
  }
});

authRouter.put('/change-password', requireAdmin, async (request, response) => {
  const { currentPassword, newPassword } = request.body;

  if (!currentPassword || !newPassword) {
    return response.status(400).json({ message: 'Current and new passwords are required.' });
  }

  if (newPassword.length < 8) {
    return response.status(400).json({ message: 'New password must contain at least 8 characters.' });
  }

  try {
    const admin = await Admin.findById(request.admin.id).select('+password');
    const passwordMatches = admin && await bcrypt.compare(currentPassword, admin.password);

    if (!passwordMatches) {
      return response.status(401).json({ message: 'Current password is incorrect.' });
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    return response.json({ message: 'Password changed successfully.' });
  } catch {
    return response.status(500).json({ message: 'Unable to change password.' });
  }
});

export default authRouter;
