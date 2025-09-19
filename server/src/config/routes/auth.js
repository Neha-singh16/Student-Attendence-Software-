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

    // res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: REFRESH_TTL_DAYS*24*3600*1000 });
    // inside routes/auth.js -> login handler, after accessToken and refreshToken are created

// set short-lived access token in cookie as well for convenience (cookie name: token)
res.cookie('token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // keep false on localhost dev
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000 // 15 minutes (match access token expiry)
});

// existing refreshToken cookie (keep as-is)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_TTL_DAYS * 24 * 3600 * 1000
});

// finally return useful info (do NOT return refresh token body)
res.json({
  accessToken, // optional since cookie is set; useful for API clients
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

router.post('/claim', async (req, res) => {
  try {
    const { claimCode, email, password } = req.body;
    if (!claimCode || !email || !password) return res.status(400).json({ error: 'claimCode,email,password required' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'invalid email' });
    if (password.length < 8) return res.status(400).json({ error: 'password too short' });

    // find student by claimCode and that is unclaimed
    const student = await Student.findOne({ claimCode: claimCode.trim(), status: 'unclaimed' });
    if (!student) return res.status(404).json({ error: 'invalid_or_already_claimed' });

    if (student.claimExpiresAt && student.claimExpiresAt < new Date()) {
      return res.status(410).json({ error: 'claim_expired' });
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
      student.claimCode = null;
      student.claimExpiresAt = null;
      student.claimedAt = new Date();
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
