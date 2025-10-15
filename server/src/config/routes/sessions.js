const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { userAuth, requireRole } = require('../middleware/userAuth');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET;
const Session = require('../models/session');
const AttendanceLog = require('../models/AttendanceLog');
const Class = require('../models/class');
const sessionEvents = require('../events/sessionEvents');

// GET /session - List all sessions (admin/teacher)
router.get('/', userAuth, async (req, res) => {
  try {
    // Only admin and teacher can list all sessions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const sessions = await Session.find().lean();
    res.json(sessions);
  } catch (err) {
    console.error('GET /session error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /session/list - List sessions for authenticated user
router.get('/list', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, classId, status, startDate, endDate } = req.query;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    // Build filter based on role
    let filter = {};
    if (!isAdmin) {
      if (req.user.role === 'teacher') {
        filter.teacherId = userId;
      } else if (req.user.role === 'student') {
        // For students, find sessions for classes they're enrolled in
        const studentDoc = await Student.findOne({ userId }).select('classId');
        if (studentDoc) {
          filter.classId = studentDoc.classId;
        } else {
          return res.json({ sessions: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
        }
      }
    }
    
    // Add additional filters
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = mongoose.Types.ObjectId(classId);
    }
    if (status) filter.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sessions = await Session.find(filter)
      .populate('classId', 'title code')
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get attendance summary for each session
    const sessionIds = sessions.map(s => s._id);
    const attendanceCounts = await AttendanceLog.aggregate([
      { $match: { sessionId: { $in: sessionIds }}},
      { $group: { 
        _id: { sessionId: '$sessionId', status: '$status' }, 
        count: { $sum: 1 }
      }}
    ]);
    
    const attendanceMap = {};
    attendanceCounts.forEach(item => {
      const sessionId = item._id.sessionId.toString();
      if (!attendanceMap[sessionId]) attendanceMap[sessionId] = {};
      attendanceMap[sessionId][item._id.status] = item.count;
    });
    
    const enrichedSessions = sessions.map(session => ({
      ...session,
      attendanceSummary: attendanceMap[session._id.toString()] || {}
    }));
    
    const total = await Session.countDocuments(filter);
    
    res.json({
      sessions: enrichedSessions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /session/list', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /session/start  -- Body { classId, durationMinutes? }
// starts a session immediately; provide `durationMinutes` to control how long it stays open
router.post('/start', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const { classId, title, scheduledAt, method, lateWindowMinutes, durationMinutes } = req.body;
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'classId required' });

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    // create session and start it right away
    const session = new Session({
      classId,
      teacherId: req.user._id,
      title: title || '',
      scheduledAt: scheduledAt || null,
      method: method || 'qr',
      lateWindowMinutes: lateWindowMinutes || 10,
      startAt: new Date(),
      status: 'open'
    });

    // token ttl: if durationMinutes provided, use it; otherwise default 120 minutes
    const ttlMs = durationMinutes && Number(durationMinutes) > 0 ? Number(durationMinutes) * 60 * 1000 : 2*60*60*1000;
    const { token, expiresAt } = session.createToken(ttlMs);
    // set session endAt to the token expiry by default (teacher may end earlier)
    session.endAt = session.tokenExpiresAt;
    await session.save();

    // qrPayload can be encoded for kiosks (server-side choose format)
    const qrPayload = Buffer.from(JSON.stringify({ sessionId: session._id.toString(), token })).toString('base64url');

    const expiresInSeconds = Math.floor((session.tokenExpiresAt.getTime() - Date.now()) / 1000);
    // emit session started event
    sessionEvents.emit('started', { sessionId: session._id.toString(), token, expiresAt: session.tokenExpiresAt });
    res.json({ sessionId: session._id, token, expiresAt: session.tokenExpiresAt, expiresInSeconds, qrPayload });
  } catch (err) {
    console.error('POST /session/start', err);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// POST /session/:id/end
router.post('/:id/end', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ error: 'invalid id' });
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'not found' });

    // ownership check
    if (session.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    session.endAt = new Date();
    session.status = 'closed';
    session.sessionToken = null;
    session.tokenExpiresAt = null;
    await session.save();

  // emit session ended event
  sessionEvents.emit('ended', { sessionId: session._id.toString(), endedAt: session.endAt });

    // basic summary: counts by status
    const agg = await AttendanceLog.aggregate([
      { $match: { sessionId: session._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = {};
    agg.forEach(a => { summary[a._id] = a.count; });

    res.json({ ok: true, endedAt: session.endAt, summary });
  } catch (err) {
    console.error('POST /session/:id/end', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// SSE subscribe for session events (secured)
// Accepts token via query `?token=...`, cookie `token`, or Authorization header.
router.get('/:id/subscribe', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).end();

    // extract token from query, cookie, or header
    let token = null;
    if (req.query && req.query.token) token = req.query.token;
    else if (req.cookies && req.cookies.token) token = req.cookies.token;
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: 'Authentication required' });
    if (!JWT_SECRET) return res.status(500).json({ error: 'Server missing JWT_SECRET' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Access token expired' });
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const userId = payload.sub;
    if (!userId) return res.status(401).json({ error: 'Invalid token payload' });

    const user = await User.findById(userId).select('-passwordHash -__v');
    if (!user) return res.status(401).json({ error: 'User not found' });

    // load session and ensure requester is owner (teacher) or admin
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.teacherId.toString() !== user._id.toString() && user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    // open SSE stream
    res.writeHead(200, {
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    });

    const onStarted = (payload) => {
      if (payload.sessionId === sessionId) res.write(`event: started\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    const onEnded = (payload) => {
      if (payload.sessionId === sessionId) res.write(`event: ended\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    sessionEvents.on('started', onStarted);
    sessionEvents.on('ended', onEnded);

    req.on('close', () => {
      sessionEvents.removeListener('started', onStarted);
      sessionEvents.removeListener('ended', onEnded);
    });
  } catch (err) {
    console.error('SSE subscribe error', err);
    // If headers already sent, just end
    if (res.headersSent) return req.socket.destroy();
    res.status(500).end();
  }
});

// GET /session/:id/logs
router.get('/:id/logs', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ error: 'invalid id' });
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'not found' });
    if (session.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const logs = await AttendanceLog.find({ sessionId: session._id }).sort({ timestamp: -1 }).lean();
    res.json({ count: logs.length, logs });
  } catch (err) {
    console.error('GET /session/:id/logs', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// PUT /session/:id/extend - Extend session duration
router.put('/:id/extend', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const sessionId = req.params.id;
    const { additionalMinutes = 30 } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    
    // Authorization check
    if (session.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    if (session.status !== 'open') {
      return res.status(400).json({ error: 'session is not open' });
    }
    
    // Extend the session
    const extensionMs = parseInt(additionalMinutes) * 60 * 1000;
    const newEndTime = new Date(session.tokenExpiresAt.getTime() + extensionMs);
    
    session.tokenExpiresAt = newEndTime;
    session.endAt = newEndTime;
    await session.save();
    
    res.json({ 
      ok: true, 
      newEndTime, 
      expiresInSeconds: Math.floor((newEndTime.getTime() - Date.now()) / 1000)
    });
  } catch (err) {
    console.error('PUT /session/:id/extend', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /session/:id/attendance-summary - Get detailed attendance for a session
router.get('/:id/attendance-summary', userAuth, requireRole('teacher','admin'), async (req,res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    
    const session = await Session.findById(sessionId).populate('classId', 'title');
    if (!session) return res.status(404).json({ error: 'session not found' });
    
    // Authorization check
    if (session.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    // Get all students in the class
    const students = await Student.find({ classId: session.classId })
      .select('name rollNo userId')
      .sort({ rollNo: 1 });
    
    // Get attendance records for this session
    const attendanceRecords = await AttendanceLog.find({ sessionId })
      .populate('studentId', 'name rollNo')
      .sort({ timestamp: 1 });
    
    // Create attendance map
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.studentId._id.toString()] = record;
    });
    
    // Build complete attendance list
    const attendanceList = students.map(student => {
      const record = attendanceMap[student._id.toString()];
      return {
        student: {
          id: student._id,
          name: student.name,
          rollNo: student.rollNo
        },
        status: record ? record.status : 'absent',
        timestamp: record ? record.timestamp : null,
        method: record ? record.method : null,
        overridden: record ? record.overridden : false,
        overrideReason: record ? record.overrideReason : null
      };
    });
    
    // Calculate statistics
    const totalStudents = students.length;
    const presentCount = attendanceList.filter(a => a.status === 'present').length;
    const lateCount = attendanceList.filter(a => a.status === 'late').length;
    const absentCount = totalStudents - presentCount - lateCount;
    const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    
    res.json({
      session: {
        id: session._id,
        title: session.title,
        class: session.classId,
        startAt: session.startAt,
        endAt: session.endAt,
        status: session.status
      },
      statistics: {
        totalStudents,
        presentCount,
        lateCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      },
      attendance: attendanceList
    });
  } catch (err) {
    console.error('GET /session/:id/attendance-summary', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
