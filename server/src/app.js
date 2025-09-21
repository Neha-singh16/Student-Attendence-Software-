// src/app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database/db');

const authRoutes = require('./config/routes/auth');
const usersRoutes = require('./config/routes/users');
const classesRoutes = require('./config/routes/class');

const studentsRoutes = require('./config/routes/students');


const app = express();
app.use(express.json({ limit: '2mb' }));
// parse urlencoded bodies (for form posts from Postman or HTML forms)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiters
app.use('/auth', rateLimit({ windowMs: 60*1000, max: 10 }));
app.use('/checkin', rateLimit({ windowMs: 1000, max: 10 }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/classes', classesRoutes);
app.use('/students', studentsRoutes);


// health
app.get('/health', (req, res) => res.json({ ok: true }));

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
