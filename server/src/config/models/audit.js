// models/AuditLog.js
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Actor who performed the action
  action: { type: String, required: true, index: true }, // Action performed (CREATE_USER, UPDATE_CLASS, etc.)
  targetType: { type: String, default: null }, // Type of target (User, Class, Session, etc.)
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true }, // ID of target object
  details: { type: mongoose.Schema.Types.Mixed, default: {} }, // Action details/changes
  before: { type: mongoose.Schema.Types.Mixed, default: null }, // State before change
  after: { type: mongoose.Schema.Types.Mixed, default: null }, // State after change
  reason: { type: String, default: null }, // Reason for the action
  ipAddress: { type: String, default: null }, // IP address of actor
  userAgent: { type: String, default: null }, // User agent
  meta: { type: mongoose.Schema.Types.Mixed, default: {} } // Additional metadata
}, { timestamps: true });

AuditLogSchema.index({ actorId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
