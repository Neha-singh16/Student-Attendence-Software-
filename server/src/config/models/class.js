// models/Class.js
const mongoose = require('mongoose');

const ScheduleItem = new mongoose.Schema({
  day: String,
  start: String,
  end: String
}, { _id: false });

const ClassSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  code: { type: String },
  schedule: { type: [ScheduleItem], default: [] },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

ClassSchema.index({ teacherId: 1 });

module.exports = mongoose.model('Class', ClassSchema);
