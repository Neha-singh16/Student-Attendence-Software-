// // models/Device.js
// const mongoose = require('mongoose');

// const DeviceSchema = new mongoose.Schema({
//   deviceId: { type: String, required: true, unique: true },
//   name: { type: String },
//   publicKey: { type: String, default: null },
//   secretHash: { type: String, default: null },
//   location: { type: String, default: null },
//   isActive: { type: Boolean, default: true },
//   lastSeen: { type: Date, default: null },
//   meta: { type: mongoose.Schema.Types.Mixed, default: {} }
// }, { timestamps: true });

// DeviceSchema.index({ deviceId: 1 }, { unique: true });

// module.exports = mongoose.model('Device', DeviceSchema);


const mongoose = require('mongoose');
const crypto = require('crypto');

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // teacher/admin who registered
  secret: { type: String, required: true }, // store raw during dev; in prod, store a hashed secret
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

// helper to create secure secret
DeviceSchema.statics.createSecret = function () {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('Device', DeviceSchema);
