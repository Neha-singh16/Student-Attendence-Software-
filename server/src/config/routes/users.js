// routes/users.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const validator = require('validator');

const { userAuth } = require('../middleware/userAuth');
const User = require('../models/user');
const RefreshToken = require('../models/RefreshToken');

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

module.exports = router;
