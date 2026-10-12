import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  className: { type: String, required: true, trim: true },
  teacher: { type: String, default: '', trim: true },
  fullMarks: { type: Number, default: 100, min: 1 },
}, { timestamps: true });

subjectSchema.index({ code: 1, className: 1 }, { unique: true });
export default mongoose.model('Subject', subjectSchema);
