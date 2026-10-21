import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireAdmin } from '../middleware/requireAdmin.js';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import { writeAudit } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';

const authRouter = Router();

function createMailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

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
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
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

    const token = jwt.sign({ adminId: admin.id, role: admin.role || 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return response.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role || 'admin' },
    });
  } catch {
    return response.status(500).json({ message: 'Unable to sign in.' });
  }
});

authRouter.post('/request-password-reset', async (request, response) => {
  const email = request.body.email?.trim().toLowerCase();
  const transport = createMailTransport();
  if (!transport) return response.status(503).json({ message: 'Password reset email is not configured yet. Add SMTP environment variables.' });
  if (!email) return response.status(400).json({ message: 'Email address is required.' });
  try {
    const user = await Admin.findOne({ email }).select('+resetCodeHash +resetCodeExpiresAt');
    if (user) {
      const code = crypto.randomInt(100000, 1000000).toString();
      user.resetCodeHash = await bcrypt.hash(code, 10);
      user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: user.email, subject: 'School Management System password reset code', text: `Your verification code is ${code}. It expires in 10 minutes.` });
    }
    return response.json({ message: 'If the account exists, a six-digit reset code was sent.' });
  } catch { return response.status(500).json({ message: 'Unable to send reset code.' }); }
});

authRouter.post('/reset-password', async (request, response) => {
  const { email, code, newPassword } = request.body;
  if (!email?.trim() || !code || !newPassword) return response.status(400).json({ message: 'Email, reset code, and new password are required.' });
  if (newPassword.length < 8) return response.status(400).json({ message: 'Password must contain at least 8 characters.' });
  try {
    const user = await Admin.findOne({ email: email.trim().toLowerCase() }).select('+password +resetCodeHash +resetCodeExpiresAt');
    const valid = user && user.resetCodeHash && user.resetCodeExpiresAt > new Date() && await bcrypt.compare(String(code), user.resetCodeHash);
    if (!valid) return response.status(400).json({ message: 'The reset code is invalid or expired.' });
    user.password = await bcrypt.hash(newPassword, 12); user.resetCodeHash = null; user.resetCodeExpiresAt = null; await user.save();
    return response.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch { return response.status(500).json({ message: 'Unable to reset password.' }); }
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
    await writeAudit(request, 'Changed password', 'Account', admin.email);

    return response.json({ message: 'Password changed successfully.' });
  } catch {
    return response.status(500).json({ message: 'Unable to change password.' });
  }
});

authRouter.put('/change-email', requireAdmin, async (request, response) => {
  const { currentPassword, newEmail } = request.body;

  if (!currentPassword || !newEmail?.trim()) {
    return response.status(400).json({ message: 'Current password and new email are required.' });
  }

  const email = newEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }

  try {
    const admin = await Admin.findById(request.admin.id).select('+password');
    const passwordMatches = admin && await bcrypt.compare(currentPassword, admin.password);

    if (!passwordMatches) {
      return response.status(401).json({ message: 'Current password is incorrect.' });
    }

    admin.email = email;
    await admin.save();
    await writeAudit(request, 'Changed email', 'Account', email);

    return response.json({
      message: 'Email changed successfully.',
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role || 'admin' },
    });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'This email address is already in use.' });
    }

    return response.status(500).json({ message: 'Unable to change email.' });
  }
});

authRouter.get('/users', requireAdmin, async (_request, response) => {
  try {
    const users = await Admin.find().select('name email role linkedStudent linkedTeacher createdAt').populate('linkedStudent', 'name studentId').populate('linkedTeacher', 'name teacherId').sort({ createdAt: -1 });
    return response.json({ users: users.map((user) => ({ ...user.toObject(), role: user.role || 'admin' })) });
  } catch { return response.status(500).json({ message: 'Unable to load user accounts.' }); }
});

authRouter.post('/users', requireAdmin, async (request, response) => {
  const { name, email, password, role, linkedStudentId = '', linkedTeacherId = '' } = request.body;
  if (!name?.trim() || !email?.trim() || !password || !['teacher', 'student', 'guardian'].includes(role)) {
    return response.status(400).json({ message: 'Name, email, password, and a valid teacher, student, or guardian role are required.' });
  }
  if (password.length < 8) return response.status(400).json({ message: 'Password must contain at least 8 characters.' });
  if (role === 'teacher' && !linkedTeacherId) return response.status(400).json({ message: 'Select the teacher record this account belongs to.' });
  if (['student', 'guardian'].includes(role) && !linkedStudentId) return response.status(400).json({ message: 'Select the student record this account belongs to.' });
  try {
    const linkedStudent = ['student', 'guardian'].includes(role) ? linkedStudentId : null;
    const linkedTeacher = role === 'teacher' ? linkedTeacherId : null;
    const relatedRecordExists = role === 'teacher'
      ? await Teacher.exists({ _id: linkedTeacher })
      : await Student.exists({ _id: linkedStudent });
    if (!relatedRecordExists) return response.status(404).json({ message: 'The selected linked record no longer exists. Refresh and try again.' });
    if (role === 'teacher' && await Admin.exists({ role, linkedTeacher })) {
      return response.status(409).json({ message: 'This teacher already has a sign-in account.' });
    }
    if (role === 'student' && await Admin.exists({ role, linkedStudent })) {
      return response.status(409).json({ message: 'This student already has a sign-in account.' });
    }

    const user = await Admin.create({ name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 12), role, linkedStudent, linkedTeacher });
    await writeAudit(request, 'Created', 'User account', `${role}: ${user.name}`);
    await createNotification('User account created', `${role} access was created for ${user.name}.`, 'success');
    return response.status(201).json({ message: `${role[0].toUpperCase()}${role.slice(1)} account created.`, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'This email address is already in use.' });
    return response.status(500).json({ message: 'Unable to create user account.' });
  }
});

authRouter.delete('/users/:id', requireAdmin, async (request, response) => {
  try {
    const user = await Admin.findById(request.params.id);
    if (!user) return response.status(404).json({ message: 'User account not found.' });
    if ((user.role || 'admin') === 'admin') return response.status(403).json({ message: 'Administrator accounts cannot be deleted from this screen.' });
    await user.deleteOne();
    await writeAudit(request, 'Deleted', 'User account', `${user.role}: ${user.name}`);
    await createNotification('User account removed', `${user.role} access for ${user.name} was removed.`, 'warning');
    return response.json({ message: 'User account deleted.' });
  } catch {
    return response.status(500).json({ message: 'Unable to delete user account.' });
  }
});

export default authRouter;
