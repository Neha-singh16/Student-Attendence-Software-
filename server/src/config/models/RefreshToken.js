// models/RefreshToken.js
const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // tokenId
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // optional TTL if desired

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
