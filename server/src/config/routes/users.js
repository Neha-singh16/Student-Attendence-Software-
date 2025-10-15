// routes/users.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const validator = require('validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { userAuth } = require('../middleware/userAuth');
const User = require('../models/user');
const RefreshToken = require('../models/RefreshToken');

// multer setup for avatar uploads
const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATAR_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads allowed'));
    }
    cb(null, true);
  }
});

// GET all users (admin only)
router.get('/', userAuth, async (req, res) => {
  try {
    // Only admin can list all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const users = await User.find().select('-passwordHash -__v -tokenVersion');
    res.json(users);
  } catch (err) {
    console.error('GET /users error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/me', userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('GET /users/me error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/me', userAuth, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'profilePicture', 'password'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }
    if (updates.firstName && updates.firstName.length < 2) return res.status(400).json({ error: 'firstName too short' });
    if (updates.password && updates.password.length < 8) return res.status(400).json({ error: 'password must be at least 8 chars' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    if (updates.firstName) user.firstName = updates.firstName;
    if (updates.lastName) user.lastName = updates.lastName;
    if (updates.profilePicture) user.profilePicture = updates.profilePicture;

    let passwordChanged = false;
    if (updates.password) {
      user.passwordHash = updates.password;
      passwordChanged = true;
    }

    await user.save();

    if (passwordChanged) {
      await RefreshToken.updateMany({ userId: user._id }, { $set: { revoked: true } }).catch(()=>{});
      user.tokenVersion += 1;
      await user.save();
    }

    res.json({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email });
  } catch (err) {
    console.error('PUT /users/me error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/:id', userAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ error: 'invalid id' });

    if (req.user._id.toString() !== targetId && !['teacher','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const user = await User.findById(targetId).select('-passwordHash -__v');
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('GET /users/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * PUT /user/me/avatar
 * Upload or replace authenticated user's avatar image
 */
router.put('/me/avatar', userAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no_file_uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    // remove old avatar file if it exists and looks like a local file
    try {
      if (user.profilePicture && !user.profilePicture.startsWith('http') && user.profilePicture.includes('uploads')) {
        const oldPath = path.join(__dirname, '..', '..', user.profilePicture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } catch (e) {
      console.warn('failed to remove old avatar', e.message);
    }

    // store relative path so it can be served statically
    const rel = path.join('uploads', 'avatars', path.basename(req.file.path)).replace(/\\/g, '/');
    user.profilePicture = rel;
    await user.save();

    res.json({ ok: true, profilePicture: user.profilePicture, url: `${req.protocol}://${req.get('host')}/${user.profilePicture}` });
  } catch (err) {
    console.error('PUT /user/me/avatar error', err);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
