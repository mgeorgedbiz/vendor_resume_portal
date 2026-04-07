const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { startImapListener } = require('../services/emailIngestion');
const EmailIngestionLog = require('../models/EmailIngestionLog');

const router = express.Router();

router.post('/start', authenticate, authorize('admin'), async (req, res) => {
  try {
    const imap = startImapListener(req.body || {});
    if (!imap) return res.status(400).json({ error: 'IMAP not configured. Set IMAP_HOST, IMAP_USER, IMAP_PASSWORD env vars.' });
    res.json({ message: 'IMAP listener started' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/log', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      EmailIngestionLog.find(filter).populate('vendor', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      EmailIngestionLog.countDocuments(filter),
    ]);
    res.json({ logs: logs.map(l => ({ ...l, id: l._id, vendor_name: l.vendor?.name })), total, page: parseInt(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
