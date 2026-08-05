import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    rollNumber: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    guardianPhone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

studentSchema.index({ name: 1 });

export default mongoose.model('Student', studentSchema);
