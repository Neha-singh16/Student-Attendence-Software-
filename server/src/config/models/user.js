// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ['teacher', 'student', 'admin'], required: true, default: 'teacher' },
  firstName: { type: String, required: true, minlength: 2 },
  lastName: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  gender: { type: String, enum: ['male','female','other', null], default: null },
  profilePicture: { type: String, default: null },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });

// hash passwordHash field if modified
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

UserSchema.methods.comparePassword = async function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.generateAccessToken = function() {
  const payload = { sub: this._id.toString(), role: this.role, tokenVersion: this.tokenVersion };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
};

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
