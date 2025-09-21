// // routes/classes.js
// const express = require('express');
// const router = express.Router();
// const mongoose = require('mongoose');
// const csv = require('csv-parser');
// const streamifier = require('streamifier');
// const multer = require('multer');
// const validator = require('validator');
// const User = require('../models/user'); 

// const { userAuth, requireRole } = require('../middleware/userAuth');
// const Class = require('../models/Class');
// const Student = require('../models/students');
// // const Student = require('../models/Student');
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// // create or return existing user by email
// async function createOrGetUserByEmail(email, studentName, session = null) {
//   if (!email) return null;
//   const existing = await User.findOne({ email: email.toLowerCase() }).session(session);
//   if (existing) return existing;

//   // create temp password (only for dev/demo; prefer invite token & email in prod)
//   const tempPassword = crypto.randomBytes(6).toString('hex');

//   const newUser = new User({
//     firstName: (studentName || '').split(' ')[0] || 'Student',
//     lastName: (studentName || '').split(' ').slice(1).join(' ') || '',
//     email: email.toLowerCase(),
//     passwordHash: tempPassword, // your User pre-save will hash this field
//     role: 'student'
//   });
//   await newUser.save({ session });
//   // NOTE: do not return the raw password in production
//   return { user: newUser, tempPassword };
// }

// router.post('/', userAuth, requireRole('teacher','admin'), async (req, res) => {
//   try {
//     const { title, code, schedule } = req.body;
//     if (!title) return res.status(400).json({ error: 'title required' });
//     const cls = new Class({ teacherId: req.user._id, title: title.trim(), code: code?.trim(), schedule: Array.isArray(schedule) ? schedule : [] });
//     await cls.save();
//     res.status(201).json(cls);
//   } catch (err) {
//     console.error('POST /classes', err);
//     res.status(500).json({ error: 'server_error' });
//   }
// });

// router.get('/:id', userAuth, async (req, res) => {
//   try {
//     const id = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
//     const cls = await Class.findById(id).lean();
//     if (!cls) return res.status(404).json({ error: 'class not found' });
//     res.json(cls);
//   } catch (err) {
//     console.error('GET /classes/:id', err);
//     res.status(500).json({ error: 'server_error' });
//   }
// });

// router.get('/:id/students', userAuth, async (req, res) => {
//   try {
//     const id = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });
//     const cls = await Class.findById(id);
//     if (!cls) return res.status(404).json({ error: 'class not found' });
//     if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'forbidden' });
//     }
//     const students = await Student.find({ classId: cls._id }).lean();
//     res.json({ count: students.length, students });
//   } catch (err) {
//     console.error('GET /classes/:id/students', err);
//     res.status(500).json({ error: 'server_error' });
//   }
// });

// // router.post('/:id/students/upload', userAuth, requireRole('teacher'), upload.single('file'), async (req, res) => {
// //   try {
// //     const classId = req.params.id;
// //     if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'invalid class id' });
// //     const cls = await Class.findById(classId);
// //     if (!cls) return res.status(404).json({ error: 'class not found' });
// //     if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ error: 'not your class' });
// //     if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'csv file required' });

// //     const rows = [];
// //     await new Promise((resolve, reject) => {
// //       streamifier.createReadStream(req.file.buffer)
// //         .pipe(csv({ skipLinesWithEmptyValues: true }))
// //         .on('data', (row) => rows.push(row))
// //         .on('end', () => resolve())
// //         .on('error', (err) => reject(err));
// //     });

// //     if (rows.length === 0) return res.status(400).json({ error: 'csv empty' });

// //     // prepare existing sets with ObjectId casting
// //     const classOid = mongoose.Types.ObjectId(classId);
// //     const existingDocs = await Student.find({ classId: classOid }).select('rollNo email').lean();
// //     const existingRolls = new Set(existingDocs.map(e => (e.rollNo || '').toLowerCase().trim()));
// //     const existingEmails = new Set(existingDocs.filter(e => e.email).map(e => e.email.toLowerCase().trim()));

// //     const toInsert = [];
// //     const errors = [];

// //     for (let i = 0; i < rows.length; i++) {
// //       const raw = rows[i];
// //       const normalized = {};
// //       Object.keys(raw).forEach(k => { normalized[k.trim().toLowerCase()] = (raw[k] || '').toString().trim(); });

// //       const name = normalized.name || '';
// //       const rollNo = normalized.rollno || normalized.roll || '';
// //       const emailRaw = normalized.email || null;
// //       const email = emailRaw ? emailRaw.toLowerCase() : null;

// //       if (!name || !rollNo) {
// //         errors.push({ row: i + 1, reason: 'missing name or rollNo', raw });
// //         continue;
// //       }

// //       const rollKey = rollNo.toLowerCase();
// //       if (existingRolls.has(rollKey)) {
// //         errors.push({ row: i + 1, reason: 'duplicate rollNo in class', rollNo });
// //         continue;
// //       }

// //       if (email) {
// //         if (!validator.isEmail(email)) {
// //           errors.push({ row: i + 1, reason: 'invalid email format', email });
// //           continue;
// //         }
// //         if (existingEmails.has(email)) {
// //           errors.push({ row: i + 1, reason: 'duplicate email in class', email });
// //           continue;
// //         }
// //       }

// //       existingRolls.add(rollKey);
// //       if (email) existingEmails.add(email);

// //       toInsert.push({ name, rollNo, email, classId: classOid });
// //     }

// //     const created = [];
// //     if (toInsert.length > 0) {
// //       try {
// //         const docs = await Student.insertMany(toInsert, { ordered: false });
// //         created.push(...docs);
// //       } catch (insertErr) {
// //         console.warn('insertMany errors', insertErr && insertErr.message);
// //         for (const doc of toInsert) {
// //           try {
// //             const s = new Student(doc);
// //             await s.save();
// //             created.push(s);
// //           } catch (e) {
// //             errors.push({ doc, reason: e.message });
// //           }
// //         }
// //       }
// //     }

// //     res.json({
// //       rowsParsed: rows.length,
// //       toInsertCount: toInsert.length,
// //       added: created.length,
// //       errors,
// //       created: created.map(c => ({ id: c._id, name: c.name, rollNo: c.rollNo }))
// //     });
// //   } catch (err) {
// //     console.error('POST /classes/:id/students/upload error', err);
// //     res.status(500).json({ error: 'server_error', detail: err.message });
// //   }
// // });


// router.post('/:id/students/upload', userAuth, requireRole('teacher'), upload.single('file'), async (req, res) => {
//   try {
//     const classId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(classId)) {
//       return res.status(400).json({ error: 'invalid class id' });
//     }

//     // use new ObjectId(...) to avoid "cannot be invoked without 'new'" error in some environments
//     const classOid = new mongoose.Types.ObjectId(classId);

//     const cls = await Class.findById(classOid);
//     if (!cls) return res.status(404).json({ error: 'class not found' });

//     // confirm ownership
//     if (cls.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'not your class' });
//     }

//     if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'csv file required' });

//     // parse CSV
//     const rows = [];
//     await new Promise((resolve, reject) => {
//       streamifier.createReadStream(req.file.buffer)
//         .pipe(csv({ skipLinesWithEmptyValues: true }))
//         .on('data', (row) => rows.push(row))
//         .on('end', () => resolve())
//         .on('error', (err) => reject(err));
//     });

//     console.log('DEBUG rowsParsed:', rows.length);
//     if (rows.length === 0) return res.status(400).json({ error: 'csv empty' });

//     // load existing students for duplicate checks
//     const existingDocs = await Student.find({ classId: classOid }).select('rollNo email').lean();
//     const existingRolls = new Set(existingDocs.map(e => (e.rollNo || '').toLowerCase().trim()));
//     const existingEmails = new Set(existingDocs.filter(e => e.email).map(e => e.email.toLowerCase().trim()));

//     const toInsert = [];
//     const errors = [];

//     for (let i = 0; i < rows.length; i++) {
//       const raw = rows[i];
//       // normalize header keys
//       const normalized = {};
//       Object.keys(raw).forEach(k => { normalized[k.trim().toLowerCase()] = (raw[k] || '').toString().trim(); });

//       const name = normalized.name || '';
//       const rollNo = normalized.rollno || normalized.roll || '';
//       const emailRaw = normalized.email || null;
//       const email = emailRaw ? emailRaw.toLowerCase() : null;

//       if (!name || !rollNo) {
//         errors.push({ row: i + 1, reason: 'missing name or rollNo', raw });
//         continue;
//       }

//       const rollKey = rollNo.toLowerCase();
//       if (existingRolls.has(rollKey)) {
//         errors.push({ row: i + 1, reason: 'duplicate rollNo in class', rollNo });
//         continue;
//       }

//       if (email) {
//         if (!validator.isEmail(email)) {
//           errors.push({ row: i + 1, reason: 'invalid email format', email });
//           continue;
//         }
//         if (existingEmails.has(email)) {
//           errors.push({ row: i + 1, reason: 'duplicate email in class', email });
//           continue;
//         }
//       }

//       // mark as reserved for this import to prevent duplicates inside CSV
//       existingRolls.add(rollKey);
//       if (email) existingEmails.add(email);

//       // cast classId to ObjectId for DB consistency
//       toInsert.push({ name, rollNo, email, classId: classOid });
//     }

//     console.log('DEBUG toInsertCount:', toInsert.length, 'errorsCount:', errors.length);

//     const created = [];
//     if (toInsert.length > 0) {
//       try {
//         const docs = await Student.insertMany(toInsert, { ordered: false });
//         created.push(...docs);
//       } catch (insertErr) {
//         console.warn('insertMany errors', insertErr && insertErr.message);
//         // fallback single inserts to collect per-doc errors
//         for (const doc of toInsert) {
//           try {
//             const s = new Student(doc);
//             await s.save();
//             created.push(s);
//           } catch (e) {
//             errors.push({ doc, reason: e.message });
//           }
//         }
//       }
//     }

//     return res.json({
//       rowsParsed: rows.length,
//       toInsertCount: toInsert.length,
//       added: created.length,
//       errors,
//       created: created.map(c => ({ id: c._id, name: c.name, rollNo: c.rollNo }))
//     });
//   } catch (err) {
//     console.error('POST /classes/:id/students/upload error', err);
//     return res.status(500).json({ error: 'server_error', detail: err.message });
//   }
// });


// module.exports = router;


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

      // return created students and createdUsersDev (dev only: remove in prod)
      return res.json({
        rowsParsed: rows.length,
        toInsertCount: normalized.length,
        added: created.length,
        errors,
  created: created.map(s => ({ id: s._id, name: s.name, rollNo: s.rollNo, userId: s.userId, claimCode: s._oneTimeClaimCode || null })),
        createdUsersDev
      });
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

module.exports = router;
