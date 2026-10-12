import mongoose from 'mongoose';

const routineSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  day: { type: String, required: true, enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
  subject: { type: String, required: true, trim: true },
  teacher: { type: String, default: '', trim: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: '', trim: true },
}, { timestamps: true });

routineSchema.index({ className: 1, section: 1, day: 1, startTime: 1 }, { unique: true });
export default mongoose.model('Routine', routineSchema);
