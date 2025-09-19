// models/Device.js
const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String },
  publicKey: { type: String, default: null },
  secretHash: { type: String, default: null },
  location: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

DeviceSchema.index({ deviceId: 1 }, { unique: true });

module.exports = mongoose.model('Device', DeviceSchema);
