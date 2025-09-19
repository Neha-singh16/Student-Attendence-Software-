// middleware/userAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn('JWT_SECRET not set in .env');

async function userAuth(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: 'Authentication required' });

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

    // tokenVersion check (optional)
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('userAuth error', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.length) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { userAuth, requireRole };
