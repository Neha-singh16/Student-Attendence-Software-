// models/Student.js
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  email: { type: String, default: null },
  status: { type: String, enum: ['unclaimed','claimed'], default: 'unclaimed' },
  claimCode: { type: String, default: null },
  claimCodeHash: { type: String, default: null, index: true },
  claimAttempts: { type: Number, default: 0 },
  claimLockedUntil: { type: Date, default: null },
  claimExpiresAt: { type: Date, default: null },
  claimedAt: { type: Date, default: null },
  consent: { type: Boolean, default: true },
  qrToken: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// ensure rollNo uniqueness per class to avoid duplicates (race protection via unique index)
StudentSchema.index({ classId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', StudentSchema);
