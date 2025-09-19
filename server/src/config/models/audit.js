// models/AuditLog.js
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  targetType: { type: String, default: null },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

AuditLogSchema.index({ actorId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
