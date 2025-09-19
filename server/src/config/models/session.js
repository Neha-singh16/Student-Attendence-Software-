// src/models/Student.js
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  rollNo: { type: String, required: true, trim: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  email: { type: String, default: null, lowercase: true, trim: true },
  consent: { type: Boolean, default: true },

  // Claim / onboarding fields
  claimCode: { type: String, default: null, index: true },
  claimExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ['unclaimed','claimed','disabled'], default: 'unclaimed' },
  claimedAt: { type: Date, default: null },

  qrToken: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Index for quick lookup by class + rollNo if needed:
StudentSchema.index({ classId: 1, rollNo: 1 }, { unique: false });

module.exports = mongoose.model('Student', StudentSchema);
