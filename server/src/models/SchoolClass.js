import mongoose from 'mongoose';

const schoolClassSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    classTeacher: { type: String, trim: true, default: '' },
    roomNumber: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

schoolClassSchema.index({ className: 1, section: 1 }, { unique: true });

export default mongoose.model('SchoolClass', schoolClassSchema);
