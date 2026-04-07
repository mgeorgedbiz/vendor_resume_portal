const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let vendorName = null;
    if (user.vendorId) {
      const vendor = await Vendor.findById(user.vendorId);
      vendorName = vendor?.name || null;
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        vendorId: user.vendorId,
        vendorName,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        vendorId: user.vendorId,
        vendorName,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let vendorName = null;
    if (user.vendorId) {
      const vendor = await Vendor.findById(user.vendorId);
      vendorName = vendor?.name || null;
    }

    res.json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vendorId: user.vendorId,
      vendorName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const { email, password, fullName, role, vendorId } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'recruiter', 'vendor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'vendor' && !vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required for vendor users' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: hash,
      fullName,
      role,
      vendorId: vendorId || null,
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vendorId: user.vendorId,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
