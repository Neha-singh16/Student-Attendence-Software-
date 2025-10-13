

const mongoose = require('mongoose');
const crypto = require('crypto');

const SessionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, default: '' },
  scheduledAt: { type: Date, default: null },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  status: { type: String, enum: ['draft','open','closed','cancelled'], default: 'draft' },

  sessionToken: { type: String, default: null, index: true },
  tokenExpiresAt: { type: Date, default: null },

  method: { type: String, enum: ['qr','manual','biometric','face'], default: 'qr' },
  lateWindowMinutes: { type: Number, default: 10 },

  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// helper to create token
SessionSchema.methods.createToken = function (ttlMs = 2*60*60*1000) {
  this.sessionToken = crypto.randomBytes(24).toString('base64url');
  this.tokenExpiresAt = new Date(Date.now() + ttlMs);
  return { token: this.sessionToken, expiresAt: this.tokenExpiresAt };
};

module.exports = mongoose.model('Session', SessionSchema);
