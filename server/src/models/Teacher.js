import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    assignedClass: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

teacherSchema.index({ name: 1 });

export default mongoose.model('Teacher', teacherSchema);
