import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subject: { type: String, required: true, trim: true },
    examType: { type: String, required: true, trim: true, default: 'Final' },
    fullMarks: { type: Number, required: true, min: 1, default: 100 },
    obtainedMarks: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
  },
  { timestamps: true },
);

resultSchema.index({ student: 1, subject: 1, examType: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);
