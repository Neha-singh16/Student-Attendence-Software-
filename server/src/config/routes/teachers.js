const express = require('express');
const router = express.Router();
const AttendanceLog = require('../models/AttendanceLog');
const { userAuth, requireRole } = require('../middleware/userAuth');
const mongoose = require('mongoose');

// POST /session/:id/override  (teacher)
router.post('/session/:id/override', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ error: 'invalid id' });

    const { studentId, status, reason } = req.body;
    if (!studentId || !status) return res.status(400).json({ error: 'studentId and status required' });

    const match = { sessionId, studentId };
    const update = {
      status,
      overridden: true,
      overriddenBy: req.user._id,
      overrideReason: reason || null,
      timestamp: new Date()
    };
    const doc = await AttendanceLog.findOneAndUpdate(match, { $set: update }, { upsert: true, new: true });
    // Optionally write an Audit collection entry here
    res.json({ ok: true, log: doc });
  } catch (err) {
    console.error('POST /session/:id/override', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /teacher/:id/reports?from=&to=
router.get('/teacher/:id/reports', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    // Implement analytics generation: attendance % per student, per class, export CSV, etc.
    // For now return a stub
    res.json({ ok: true, message: 'implement report generation; use AttendanceLog aggregation to compute metrics' });
  } catch (err) {
    console.error('GET /teacher/:id/reports', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
