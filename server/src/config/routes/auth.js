// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Student = require('../models/students');
const User = require('../models/user');
const RefreshToken = require('../models/RefreshToken');
// const crypto = require('crypto');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || '7', 10);

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

async function createRefreshToken(userId) {
  const tokenId = uuidv4();
  const raw = crypto.randomBytes(48).toString('hex');
  const combined = `${tokenId}:${raw}`;
  const hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS*24*3600*1000);
  await RefreshToken.create({ _id: tokenId, userId, tokenHash: hash, expiresAt });
  return combined;
}

async function rotateRefreshToken(oldCombined) {
  if (!oldCombined || !oldCombined.includes(':')) return null;
  const [tokenId, raw] = oldCombined.split(':');
  const rt = await RefreshToken.findById(tokenId);
  if (!rt) return null;
  if (rt.expiresAt < new Date() || rt.revoked) { await rt.deleteOne(); return null; }
  const ok = await bcrypt.compare(raw, rt.tokenHash);
  if (!ok) { await rt.deleteOne().catch(()=>{}); return null; }
  await rt.deleteOne();
  return createRefreshToken(rt.userId.toString());
}

// register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !email || !password) return res.status(400).json({ error: 'missing fields' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'email taken' });

    const user = new User({
      firstName, lastName, email: email.toLowerCase(),
      passwordHash: password,
      role: role || 'teacher'
    });
    await user.save();
    res.json({ userId: user._id });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'missing fields' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user._id.toString());


res.cookie('token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // keep false on localhost dev
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000 // 15 minutes (match access token expiry)
});


res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_TTL_DAYS * 24 * 3600 * 1000
});

res.json({
  accessToken, 
  user: { id: user._id, firstName: user.firstName, role: user.role }
});

    // res.json({ accessToken, user: { id: user._id, firstName: user.firstName, role: user.role } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// refresh
router.post('/refresh', async (req, res) => {
  try {
    const combined = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!combined) return res.status(401).json({ error: 'refresh token required' });

    const newCombined = await rotateRefreshToken(combined);
    if (!newCombined) return res.status(401).json({ error: 'invalid_refresh' });

    const [newId] = newCombined.split(':');
    const newRtRecord = await RefreshToken.findById(newId);
    if (!newRtRecord) return res.status(500).json({ error: 'server_error' });

    const user = await User.findById(newRtRecord.userId);
    if (!user) return res.status(401).json({ error: 'user_not_found' });

    const accessToken = signAccessToken(user);

    res.cookie('refreshToken', newCombined, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: REFRESH_TTL_DAYS*24*3600*1000 });
    res.json({ accessToken });
  } catch (err) {
    console.error('refresh error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// logout
router.post('/logout', async (req, res) => {
  try {
    const combined = req.cookies?.refreshToken || req.body?.refreshToken;
    if (combined && combined.includes(':')) {
      const [tokenId] = combined.split(':');
      await RefreshToken.findByIdAndUpdate(tokenId, { revoked: true }).catch(()=>{});
    }
    res.clearCookie('refreshToken');
    res.json({ ok: true });
  } catch (err) {
    console.error('logout error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// profile - get current user info
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'token_required' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: 'user_not_found' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('profile error', err);
    res.status(401).json({ error: 'invalid_token' });
  }
});

router.post('/claim', async (req, res) => {
  try {
    const { claimCode, email, password } = req.body;
    if (!claimCode || !email || !password) return res.status(400).json({ error: 'claimCode,email,password required' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'invalid email' });
    if (password.length < 8) return res.status(400).json({ error: 'password too short' });

    // hashed lookup to avoid storing plaintext codes
    const secret = process.env.CLAIM_SECRET || 'dev-claim-secret';
    const codeHash = crypto.createHmac('sha256', secret).update(String(claimCode)).digest('hex');
    const now = new Date();
    const student = await Student.findOne({ claimCodeHash: codeHash, status: 'unclaimed', claimExpiresAt: { $gt: now } });
    if (!student) return res.status(404).json({ error: 'invalid_or_already_claimed' });

    if (student.claimLockedUntil && student.claimLockedUntil > new Date()) {
      return res.status(429).json({ error: 'too_many_attempts' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // ensure unique user email
      const emailNorm = email.toLowerCase();
      const existingUser = await User.findOne({ email: emailNorm }).session(session);
      if (existingUser) {
        // if email already belongs to a user, we cannot auto-link without additional verification
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ error: 'email_taken' });
      }

      // create user
      const newUser = new User({
        firstName: (student.name || '').split(' ')[0] || 'Student',
        lastName: (student.name || '').split(' ').slice(1).join(' ') || '',
        email: emailNorm,
        passwordHash: password, // pre-save hook will hash on User model
        role: 'student',
        emailVerified: true
      });
      await newUser.save({ session });

  // link student and mark claimed
  student.userId = newUser._id;
  student.status = 'claimed';
  student.claimedAt = new Date();
  student.claimCodeHash = null;
  student.claimCode = null;
  student.claimAttempts = 0;
  student.claimLockedUntil = null;
  await student.save({ session });

      await session.commitTransaction();
      session.endSession();

      // issue access token
      const token = jwt.sign({ sub: newUser._id.toString(), role: newUser.role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
      res.json({ accessToken: token, user: { id: newUser._id, firstName: newUser.firstName, role: newUser.role } });
    } catch (txErr) {
      await session.abortTransaction().catch(()=>{});
      session.endSession();
      console.error('claim tx error', txErr);
      return res.status(500).json({ error: 'server_error', detail: txErr.message });
    }
  } catch (err) {
    console.error('POST /auth/claim error', err);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});


module.exports = router;
