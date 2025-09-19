// models/Student.js
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  email: { type: String, default: null },
  consent: { type: Boolean, default: true },
  qrToken: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

StudentSchema.index({ classId: 1 });

module.exports = mongoose.model('Student', StudentSchema);
