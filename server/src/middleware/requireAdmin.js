import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export async function requireAdmin(request, response, next) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return response.status(401).json({ message: 'Authentication token is required.' });
  }

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({ message: 'JWT_SECRET is not configured.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.adminId).select('-password');

    if (!admin) {
      return response.status(401).json({ message: 'Administrator account was not found.' });
    }

    request.admin = admin;
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}
