// models/AttendanceLog.js
const mongoose = require('mongoose');

const AttendanceLogSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  timestamp: { type: Date, default: Date.now },
  method: { type: String, enum: ['face','qr','manual'], default: 'face' },
  matchScore: { type: Number, default: null },
  livenessPassed: { type: Boolean, default: null },
  deviceId: { type: String, default: null },
  status: { type: String, enum: ['present','late','absent','pending','rejected'], default: 'present' },
  adminOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

AttendanceLogSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceLog', AttendanceLogSchema);
