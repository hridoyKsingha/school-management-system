import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'teacher', 'student', 'guardian'], default: 'admin', required: true },
    linkedStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    linkedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    resetCodeHash: { type: String, select: false, default: null },
    resetCodeExpiresAt: { type: Date, select: false, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('Admin', adminSchema);
