// src/routes/classes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const csv = require('csv-parser');
const streamifier = require('streamifier');
const multer = require('multer');
const validator = require('validator');
const crypto = require('crypto');
// local helper for claim hashing (same as students route)
function hashClaimCode(code) {
  const secret = process.env.CLAIM_SECRET || 'dev-claim-secret';
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

const { userAuth, requireRole } = require('../middleware/userAuth');
const Class = require('../models/class');
const Student = require('../models/students');
const User = require('../models/user');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

/* Helper: generate short claim code (alnum) */
function genClaimCode(len = 9) {
  // generate url-safe base64, strip non-alnum and trim
  return crypto.randomBytes(Math.ceil(len * 0.75))
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, len);
}

/* Helper: create or get user immediately (dev-friendly)
   returns { user, created, tempPassword }  */
async function createOrGetUserImmediate(email, displayName, session = null) {
  if (!email) return { user: null, created: false, tempPassword: null };
  const normalized = email.toLowerCase();
  const existing = await User.findOne({ email: normalized }).session(session);
  if (existing) return { user: existing, created: false, tempPassword: null };

  const tempPassword = crypto.randomBytes(6).toString('hex'); // dev-only; do not return this in prod
  const user = new User({
    firstName: (displayName || '').split(' ')[0] || 'Student',
    lastName: (displayName || '').split(' ').slice(1).join(' ') || '',
    email: normalized,
    passwordHash: tempPassword,
    role: 'student',
    emailVerified: false
  });

  await user.save({ session });
  return { user, created: true, tempPassword };
}

/* GET /classes
   List all classes for the authenticated user */
router.get('/', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    // Build filter based on role
    let filter = {};
    if (!isAdmin) {
      if (req.user.role === 'teacher') {
        filter.teacherId = userId;
      } else if (req.user.role === 'student') {
        // For students, get classes they're enrolled in
        const studentDoc = await Student.findOne({ userId }).select('classId');
        if (studentDoc) {
          filter._id = studentDoc.classId;
        } else {
          return res.json({ classes: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
        }
      }
    }
    
    // Add search filter if provided
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' }},
        { code: { $regex: search, $options: 'i' }}
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const classes = await Class.find(filter)
      .populate('teacherId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get student count for each class
    const classIds = classes.map(c => c._id);
    const studentCounts = await Student.aggregate([
      { $match: { classId: { $in: classIds }}},
      { $group: { _id: '$classId', count: { $sum: 1 }}}
    ]);
    
    const studentCountMap = studentCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});
    
    // Add student count to each class
    const enrichedClasses = classes.map(cls => ({
      ...cls,
      studentCount: studentCountMap[cls._id.toString()] || 0
    }));
    
    const total = await Class.countDocuments(filter);
    
    res.json({
      classes: enrichedClasses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /classes error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* POST /classes
   Create class (teacher/admin) */
router.post('/', userAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, code, schedule } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const cls = new Class({ teacherId: req.user._id, title: title.trim(), code: code?.trim(), schedule: Array.isArray(schedule) ? schedule : [] });
    await cls.save();
    res.status(201).json(cls);
  } catch (err) {
    console.error('POST /classes error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* GET /classes/:id */
router.get('/:id', userAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    const cls = await Class.findById(id).lean();
    if (!cls) return res.status(404).json({ error: 'class not found' });
    res.json(cls);
  } catch (err) {
    console.error('GET /classes/:id', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* GET /classes/:id/students -- teacher/admin only (owner check done) */
router.get('/:id/students', userAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const students = await Student.find({ classId: cls._id }).lean();
    res.json({ count: students.length, students });
  } catch (err) {
    console.error('GET /classes/:id/students', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* POST /classes/:id/students/upload
   CSV: name, rollNo, email (email optional). Behavior:
   - if email present: create (or link) User immediately, set student.userId (dev returns tempPwd)
   - if email absent: create Student with claimCode & claimExpiresAt (teacher distributes code)
*/
router.post('/:id/students/upload', userAuth, requireRole('teacher'), upload.single('file'), async (req, res) => {
  const classId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'invalid class id' });
    const classOid = new mongoose.Types.ObjectId(classId);
    const cls = await Class.findById(classOid);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'not your class' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'csv file required' });

    // parse CSV
    const rows = await new Promise((resolve, reject) => {
      const out = [];
      streamifier.createReadStream(req.file.buffer)
        .pipe(csv({ skipLinesWithEmptyValues: true }))
        .on('data', r => out.push(r))
        .on('end', () => resolve(out))
        .on('error', e => reject(e));
    });

    if (!rows || rows.length === 0) return res.status(400).json({ error: 'csv empty' });

    // load existing students (for duplicate checks)
    const existingDocs = await Student.find({ classId: classOid }).select('rollNo email').lean();
    const existingRolls = new Set(existingDocs.map(e => (e.rollNo || '').toLowerCase().trim()));
    const existingEmails = new Set(existingDocs.filter(e => e.email).map(e => e.email.toLowerCase().trim()));

    const normalized = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const norm = {};
      Object.keys(raw).forEach(k => { norm[k.trim().toLowerCase()] = (raw[k] || '').toString().trim(); });
      const name = norm.name || '';
      const rollNo = norm.rollno || norm.roll || '';
      const emailRaw = norm.email || null;
      const email = emailRaw ? emailRaw.toLowerCase() : null;

      if (!name || !rollNo) { errors.push({ row: i + 1, reason: 'missing name or rollNo', raw }); continue; }

      const rollKey = rollNo.toLowerCase();
      if (existingRolls.has(rollKey)) { errors.push({ row: i + 1, reason: 'duplicate rollNo in class', rollNo }); continue; }

      if (email) {
        if (!validator.isEmail(email)) { errors.push({ row: i + 1, reason: 'invalid email format', email }); continue; }
        if (existingEmails.has(email)) { errors.push({ row: i + 1, reason: 'duplicate email in class', email }); continue; }
      }

      existingRolls.add(rollKey);
      if (email) existingEmails.add(email);

      normalized.push({ name, rollNo, email });
    }

    if (normalized.length === 0) {
      return res.json({ rowsParsed: rows.length, toInsertCount: 0, added: 0, errors, created: [] });
    }

    // start transaction for atomicity (works on replica set / Atlas)
    const session = await mongoose.startSession();
    session.startTransaction();
    const created = [];
    const createdUsersDev = []; // dev-only: contains { email, tempPassword, userId }
    try {
      for (const item of normalized) {
        let linkedUser = null;
        let tempPassword = null;

        if (item.email) {
          const { user, created: ucreated, tempPassword: tp } = await createOrGetUserImmediate(item.email, item.name, session);
          if (user) {
            linkedUser = user;
            if (ucreated) {
              tempPassword = tp;
              createdUsersDev.push({ email: item.email, tempPassword: tp, userId: user._id.toString() });
            }
          }
        }

        if (!linkedUser) {
          // generate claim code for non-email or if teacher prefers claim flow
          const claimCode = genClaimCode(9);
          const claimExpiresAt = new Date(Date.now() + (30 * 24 * 3600 * 1000)); // 30 days
          const student = new Student({
            name: item.name,
            rollNo: item.rollNo,
            email: item.email || null,
            classId: classOid,
            userId: linkedUser ? linkedUser._id : null,
            claimCode: null,
            claimCodeHash: hashClaimCode(claimCode),
            claimExpiresAt: linkedUser ? null : claimExpiresAt,
            status: linkedUser ? 'claimed' : 'unclaimed'
          });
          await student.save({ session });
          // attach one-time claimCode to created output for teacher (dev-only)
          student._oneTimeClaimCode = claimCode;
          created.push(student);
        } else {
          // if linkedUser exists, create student with userId
          const student = new Student({
            name: item.name,
            rollNo: item.rollNo,
            email: item.email || null,
            classId: classOid,
            userId: linkedUser._id,
            claimCode: null,
            claimExpiresAt: null,
            status: 'claimed'
          });
          await student.save({ session });
          created.push(student);
        }
      }

      await session.commitTransaction();
      session.endSession();

      // return created students; do not leak plaintext claim codes or temp passwords
      const createdOut = created.map(s => ({ id: s._id, name: s.name, rollNo: s.rollNo, userId: s.userId }));
      if (process.env.DEV_RETURN_SECRETS === 'true') {
        // attach one-time claim codes and createdUsers info in dev only
        createdOut.forEach((o, idx) => { o.claimCode = created[idx]._oneTimeClaimCode || null; });
      }

      const out = {
        rowsParsed: rows.length,
        toInsertCount: normalized.length,
        added: created.length,
        errors,
        created: createdOut
      };
      if (process.env.DEV_RETURN_SECRETS === 'true') out.createdUsersDev = createdUsersDev;
      return res.json(out);
    } catch (txErr) {
      console.error('upload tx error', txErr);
      await session.abortTransaction().catch(()=>{});
      session.endSession();
      return res.status(500).json({ error: 'server_error', detail: txErr.message });
    }

  } catch (err) {
    console.error('POST /classes/:id/students/upload error', err);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

/* PUT /classes/:id
   Update class details (teacher/admin) */
router.put('/:id', userAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    
    // Authorization check
    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    const { title, code, schedule } = req.body;
    const updates = {};
    
    if (title !== undefined) updates.title = title.trim();
    if (code !== undefined) updates.code = code?.trim();
    if (schedule !== undefined) updates.schedule = Array.isArray(schedule) ? schedule : [];
    
    const updatedClass = await Class.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    
    res.json(updatedClass);
  } catch (err) {
    console.error('PUT /classes/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* DELETE /classes/:id
   Delete class (teacher/admin) */
router.delete('/:id', userAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    
    // Authorization check
    if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    // Check if there are any sessions for this class
    const Session = require('../models/session');
    const sessionCount = await Session.countDocuments({ classId: id });
    
    if (sessionCount > 0) {
      return res.status(400).json({ 
        error: 'cannot_delete', 
        message: 'Class has associated sessions. Please delete sessions first or contact admin.' 
      });
    }
    
    // Delete associated students
    await Student.deleteMany({ classId: id });
    
    // Delete the class
    await cls.deleteOne();
    
    res.json({ ok: true, message: 'Class deleted successfully' });
  } catch (err) {
    console.error('DELETE /classes/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* GET /classes/:id/sessions
   Get all sessions for a class */
router.get('/:id/sessions', userAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, limit = 20, status } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
    
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    
    // Authorization check - students can view their class sessions
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id, classId: id });
      if (!student) return res.status(403).json({ error: 'forbidden' });
    } else if (req.user.role === 'teacher' && cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    const Session = require('../models/session');
    
    // Build filter
    const filter = { classId: id };
    if (status) filter.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sessions = await Session.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get attendance counts for each session
    const sessionIds = sessions.map(s => s._id);
    const attendanceCounts = await AttendanceLog.aggregate([
      { $match: { sessionId: { $in: sessionIds }}},
      { $group: { 
        _id: { sessionId: '$sessionId', status: '$status' }, 
        count: { $sum: 1 }
      }}
    ]);
    
    // Process attendance counts
    const attendanceMap = {};
    attendanceCounts.forEach(item => {
      const sessionId = item._id.sessionId.toString();
      if (!attendanceMap[sessionId]) attendanceMap[sessionId] = {};
      attendanceMap[sessionId][item._id.status] = item.count;
    });
    
    // Add attendance summary to sessions
    const enrichedSessions = sessions.map(session => ({
      ...session,
      attendance: attendanceMap[session._id.toString()] || {}
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
    console.error('GET /classes/:id/sessions error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
