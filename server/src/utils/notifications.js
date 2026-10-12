import Notification from '../models/Notification.js';

export async function createNotification(title, message, type = 'info') {
  try { await Notification.create({ title, message, type }); } catch { /* Notification failure is non-critical. */ }
}
