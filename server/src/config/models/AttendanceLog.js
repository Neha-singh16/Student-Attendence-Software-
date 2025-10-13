// // models/AttendanceLog.js
// const mongoose = require('mongoose');

// const AttendanceLogSchema = new mongoose.Schema({
//   sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
//   studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
//   timestamp: { type: Date, default: Date.now },
//   method: { type: String, enum: ['face','qr','manual'], default: 'face' },
//   matchScore: { type: Number, default: null },
//   livenessPassed: { type: Boolean, default: null },
//   deviceId: { type: String, default: null },
//   status: { type: String, enum: ['present','late','absent','pending','rejected'], default: 'present' },
//   adminOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
//   meta: { type: mongoose.Schema.Types.Mixed, default: {} }
// }, { timestamps: true });

// AttendanceLogSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// module.exports = mongoose.model('AttendanceLog', AttendanceLogSchema);


const mongoose = require('mongoose');

const AttendanceLogSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

  status: { type: String, enum: ['present','absent','late','excused'], default: 'present' },
  timestamp: { type: Date, default: Date.now },
  method: { type: String, enum: ['qr','manual','face','biometric'], default: 'qr' },
  deviceId: { type: String, default: null },

  // optional client-provided id to dedupe events from device (device-side unique id)
  clientEventId: { type: String, default: null, index: true },

  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  // override / audit
  overridden: { type: Boolean, default: false },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  overrideReason: { type: String, default: null }
}, { timestamps: true });

// Ensure uniqueness per session+student (makes upserts safer)
AttendanceLogSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceLog', AttendanceLogSchema);
