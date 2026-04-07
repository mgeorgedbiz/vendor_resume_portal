const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-secret-in-production';

/**
 * Verify JWT token and attach user to request
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restrict access to specific roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * For vendor users, restrict to only seeing their own vendor's data
 */
function vendorScope(req, res, next) {
  if (req.user.role === 'vendor') {
    req.vendorId = req.user.vendorId;
  }
  next();
}

module.exports = { authenticate, authorize, vendorScope };
