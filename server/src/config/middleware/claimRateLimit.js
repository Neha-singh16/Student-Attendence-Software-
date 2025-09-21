// Simple in-memory rate limiter for claim endpoints (dev-only)
// Limits by IP: `max` requests per `windowMs` milliseconds.
const stores = new Map();
module.exports = function claimRateLimit(opts = {}) {
  const max = opts.max || 20;
  const windowMs = opts.windowMs || 60 * 60 * 1000; // 1 hour default

  return (req, res, next) => {
    try {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      let rec = stores.get(ip);
      if (!rec || rec.start + windowMs < now) {
        rec = { count: 1, start: now };
        stores.set(ip, rec);
      } else {
        rec.count++;
      }

      if (rec.count > max) {
        res.status(429).json({ error: 'rate_limit_exceeded' });
        return;
      }
      next();
    } catch (e) {
      next();
    }
  };
};
