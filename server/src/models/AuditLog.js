import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: String, default: 'System' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  details: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
