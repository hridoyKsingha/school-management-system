import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  audience: { type: String, enum: ['All', 'Admin', 'Teacher', 'Student', 'Guardian'], default: 'All' },
  priority: { type: String, enum: ['Normal', 'Important', 'Urgent'], default: 'Normal' },
  publishedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Notice', noticeSchema);
