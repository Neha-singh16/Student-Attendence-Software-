const express = require('express');
const router = express.Router();
const Device = require('../models/device');
const AttendanceLog = require('../models/AttendanceLog');
const Session = require('../models/session');
const ProcessedEvent = require('../models/processedEvent');
const mongoose = require('mongoose');
const crypto = require('crypto');

const { userAuth, requireRole } = require('../middleware/userAuth');

// POST /device/register  -> returns { deviceId, secret }
router.post('/register', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const secret = Device.createSecret();
    const device = new Device({ name, owner: req.user._id, secret });
    await device.save();

    // return secret once (store securely on device)
    res.json({ deviceId: device._id, secret });
  } catch (err) {
    console.error('POST /device/register', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// helper: verify signature (HMAC SHA256)
function verifySignature(secret, payloadString, signature) {
  const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  return expected === signature;
}

// POST /device/:id/sync
router.post('/:id/sync', async (req,res) => {
  try {
    const deviceId = req.params.id;
    // simple per-device in-memory rate limiter
    const RATE_MAX = Number(process.env.DEVICE_SYNC_RATE_MAX || '60'); // requests per window
    const RATE_WINDOW_MS = Number(process.env.DEVICE_SYNC_RATE_WINDOW_MS || String(60 * 1000));
    if (!global.__deviceSyncRate) global.__deviceSyncRate = new Map();
    const now = Date.now();
    const entry = global.__deviceSyncRate.get(deviceId) || { count: 0, windowStart: now };
    if (now - entry.windowStart > RATE_WINDOW_MS) {
      entry.count = 0; entry.windowStart = now;
    }
    entry.count += 1;
    global.__deviceSyncRate.set(deviceId, entry);
    if (entry.count > RATE_MAX) return res.status(429).json({ error: 'rate_limit_exceeded' });
    const { signedEvents, signature } = req.body; // signedEvents is array, signature is HMAC over JSON.stringify(signedEvents)
    if (!signedEvents || !Array.isArray(signedEvents) || !signature) return res.status(400).json({ error: 'signedEvents and signature required' });

    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ error: 'device not found' });

    const payload = JSON.stringify(signedEvents);
    if (!verifySignature(device.secret, payload, signature)) {
      return res.status(401).json({ error: 'invalid_signature' });
    }

  // process each event idempotently
    const results = [];
  console.log(`Device sync from ${deviceId}: ${signedEvents.length} events (batch)`);
    for (const ev of signedEvents) {
      // event should include: { clientEventId, sessionToken, studentId, timestamp, status }
      try {
        const session = await Session.findOne({ sessionToken: ev.sessionToken, status: 'open' });
        if (!session) { results.push({ clientEventId: ev.clientEventId, ok: false, reason: 'invalid_session' }); continue; }
        if (session.tokenExpiresAt && session.tokenExpiresAt < new Date()) { results.push({ clientEventId: ev.clientEventId, ok: false, reason: 'session_expired' }); continue; }

        // validate studentId
        if (!ev.studentId || !mongoose.Types.ObjectId.isValid(ev.studentId)) { results.push({ clientEventId: ev.clientEventId, ok: false, reason: 'invalid_studentId' }); continue; }

        // replay protection: if clientEventId provided, ensure not processed before
        if (ev.clientEventId) {
          try {
            await ProcessedEvent.create({ deviceId: deviceId, clientEventId: String(ev.clientEventId) });
          } catch (dupErr) {
            // duplicate key -> already processed
            results.push({ clientEventId: ev.clientEventId, ok: false, reason: 'duplicate_event' });
            continue;
          }
        }

        // upsert by clientEventId (preferred) or by sessionId + studentId
        const match = ev.clientEventId ? { clientEventId: ev.clientEventId } : { sessionId: session._id, studentId: ev.studentId };
        const update = {
          sessionId: session._id,
          classId: session.classId,
          studentId: mongoose.Types.ObjectId(ev.studentId),
          status: ev.status || 'present',
          timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
          method: ev.method || 'qr',
          deviceId: deviceId,
          clientEventId: ev.clientEventId || null
        };

        const doc = await AttendanceLog.findOneAndUpdate(match, { $set: update }, { upsert: true, new: true });
        results.push({ clientEventId: ev.clientEventId, ok: true });
      } catch (ee) {
        results.push({ clientEventId: ev.clientEventId, ok: false, reason: ee.message });
      }
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error('POST /device/:id/sync', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
