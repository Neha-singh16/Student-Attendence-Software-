// src/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database/db');
const cors = require('cors');

const authRoutes = require('./config/routes/auth');
const usersRoutes = require('./config/routes/users');
const classesRoutes = require('./config/routes/class');

const studentsRoutes = require('./config/routes/students');
const sessionRouter = require('./config/routes/sessions');
const deviceRouter = require('./config/routes/devices');
const checkinRouter = require('./config/routes/checkin');
const teacherRouter = require('./config/routes/teachers');
const adminRouter = require('./config/routes/admin');
const analyticsRouter = require('./config/routes/analytics');
const notificationsRouter = require('./config/routes/notifications');

const app = express();
app.use(express.json({ limit: '2mb' }));
// parse urlencoded bodies (for form posts from Postman or HTML forms)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
// serve uploaded static files (avatars etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiters
app.use('/auth', rateLimit({ windowMs: 60*1000, max: 10 }));
app.use('/checkin', rateLimit({ windowMs: 1000, max: 10 }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
// alias for legacy/singleton path used by some clients
app.use('/user', usersRoutes);
app.use('/classes', classesRoutes);
app.use('/students', studentsRoutes);
app.use('/session', sessionRouter);
app.use('/device', deviceRouter);
app.use('/checkin', checkinRouter);
app.use('/', teacherRouter);
app.use('/admin', adminRouter);
app.use('/analytics', analyticsRouter);
app.use('/notifications', notificationsRouter);



// health
app.get('/health', (req, res) => res.json({ ok: true }));

// periodic sweeper: close sessions whose tokenExpiredAt passed
const Session = require('./config/models/session');
const sessionEvents = require('./config/events/sessionEvents');
setInterval(async () => {
  try {
    const now = new Date();
    const sessions = await Session.find({ status: 'open', tokenExpiresAt: { $lte: now } });
    for (const s of sessions) {
      s.status = 'closed'; s.endAt = now; s.sessionToken = null; s.tokenExpiresAt = null;
      await s.save();
      sessionEvents.emit('ended', { sessionId: s._id.toString(), endedAt: now });
    }
    if (sessions.length) console.log(`Session sweeper closed ${sessions.length} sessions`);
  } catch (e) {
    console.error('session sweeper error', e.message);
  }
}, 30 * 1000); // every 30s

// connect db & start
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
