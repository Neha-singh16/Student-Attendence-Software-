// models/BiometricTemplate.js
const mongoose = require('mongoose');

const BiometricTemplateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  algoVersion: { type: String, default: 'stub-v1' },
  vector: { type: [Number], required: true },
  deviceId: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

BiometricTemplateSchema.index({ studentId: 1 });

module.exports = mongoose.model('BiometricTemplate', BiometricTemplateSchema);
