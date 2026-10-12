import AuditLog from '../models/AuditLog.js';

export async function writeAudit(request, action, entity, details = '') {
  try { await AuditLog.create({ actor: request.admin?.email || 'System', action, entity, details }); } catch { /* Audit logging must not interrupt the main action. */ }
}
