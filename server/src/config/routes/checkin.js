const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Session = require('../models/session');
const AttendanceLog = require('../models/AttendanceLog');
const Student = require('../models/students');
const ProcessedEvent = require('../models/processedEvent');

// helper: verify session token
async function validateSessionToken(token) {
  if (!token) return null;
  const session = await Session.findOne({ sessionToken: token, status: 'open' });
  if (!session) return null;
  if (session.tokenExpiresAt && session.tokenExpiresAt < new Date()) return null;
  return session;
}

// POST /checkin/qr
router.post('/qr', async (req,res) => {
  try {
    const { sessionToken, studentQrToken, deviceId, clientEventId } = req.body;
    if (!sessionToken || !studentQrToken) return res.status(400).json({ error: 'sessionToken and studentQrToken required' });

    const session = await validateSessionToken(sessionToken);
    if (!session) return res.status(400).json({ error: 'invalid_or_expired_session' });

    const student = await Student.findOne({ qrToken: studentQrToken });
    if (!student) return res.status(404).json({ error: 'student_not_found' });

    // replay protection: if clientEventId provided, ensure not processed before
    if (clientEventId) {
      try {
        await ProcessedEvent.create({ deviceId: deviceId || null, clientEventId: String(clientEventId) });
      } catch (dupErr) {
        return res.status(409).json({ error: 'duplicate_event' });
      }
    }

    // upsert attendance (idempotent)
    const update = {
      sessionId: session._id,
      classId: session.classId,
      studentId: student._id,
      status: 'present',
      timestamp: new Date(),
      method: 'qr',
      deviceId: deviceId || null,
      clientEventId: clientEventId || null
    };

    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const doc = await AttendanceLog.findOneAndUpdate(
      { sessionId: session._id, studentId: student._id },
      { $set: update },
      opts
    );

    res.json({ ok: true, studentId: student._id, status: doc.status, timestamp: doc.timestamp });
  } catch (err) {
    console.error('POST /checkin/qr', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /checkin/face
router.post('/face', async (req,res) => {
  try {
    const { sessionToken, embedding, livenessPassed = false, deviceId, clientEventId } = req.body;
    if (!sessionToken || !embedding) return res.status(400).json({ error: 'sessionToken and embedding required' });

    const session = await validateSessionToken(sessionToken);
    if (!session) return res.status(400).json({ error: 'invalid_or_expired_session' });

    // Forward to face verification service (example HTTP call). Replace URL with your python microservice.
    // The face service should return { ok: true, bestMatch: { studentId, score } } or { ok: false }
    // For demo we'll do a naive lookup (NOT FOR PROD)
    // TODO: call external service...
    const faceServiceUrl = process.env.FACE_SERVICE_URL; // e.g. http://localhost:5000/verify

    let bestMatch = null;
    if (faceServiceUrl) {
      // forward using fetch/axios (example with axios)
      const axios = require('axios');
      const resp = await axios.post(`${faceServiceUrl}/verify`, { embedding, livenessPassed });
      if (resp.data && resp.data.ok && resp.data.bestMatch) bestMatch = resp.data.bestMatch;
    } else {
      // FALLBACK - naive: no matching
      return res.status(501).json({ error: 'face_service_unconfigured' });
    }

  if (!bestMatch || !bestMatch.studentId) return res.status(200).json({ status: 'failed' });

    // if match confidence high enough, mark present
    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.75');
    if (bestMatch.score < threshold) return res.json({ status: 'pending', score: bestMatch.score });

    // replay protection: if clientEventId provided, ensure not processed before
    if (clientEventId) {
      try {
        await ProcessedEvent.create({ deviceId: deviceId || null, clientEventId: String(clientEventId) });
      } catch (dupErr) {
        return res.status(409).json({ error: 'duplicate_event' });
      }
    }

    // upsert attendance
    const studentId = mongoose.Types.ObjectId(bestMatch.studentId);
    const update = {
      sessionId: session._id,
      classId: session.classId,
      studentId,
      status: 'present',
      timestamp: new Date(),
      method: 'face',
      deviceId: deviceId || null,
      clientEventId: clientEventId || null,
      meta: { score: bestMatch.score }
    };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const doc = await AttendanceLog.findOneAndUpdate({ sessionId: session._id, studentId }, { $set: update }, opts);

    res.json({ status: 'present', studentId, score: bestMatch.score, timestamp: doc.timestamp });
  } catch (err) {
    console.error('POST /checkin/face', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
