const express = require('express');
const Vendor = require('../models/Vendor');
const Candidate = require('../models/Candidate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 }).lean();
    const stats = await Candidate.aggregate([
      { $group: {
        _id: '$sourceVendor',
        total: { $sum: 1 },
        selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      }}
    ]);
    const statsMap = {};
    for (const s of stats) { statsMap[s._id?.toString()] = s; }
    const result = vendors.map(v => ({
      ...v, id: v._id,
      total_candidates: statsMap[v._id.toString()]?.total || 0,
      selected_count: statsMap[v._id.toString()]?.selected || 0,
      rejected_count: statsMap[v._id.toString()]?.rejected || 0,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).lean();
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const stats = await Candidate.aggregate([
      { $match: { sourceVendor: vendor._id } },
      { $group: { _id: null, total: { $sum: 1 },
        selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      }}
    ]);
    res.json({ ...vendor, id: vendor._id,
      total_candidates: stats[0]?.total || 0,
      selected_count: stats[0]?.selected || 0,
      rejected_count: stats[0]?.rejected || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { name, email, emailDomains, contactPerson, phone, color } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const vendor = await Vendor.create({ name, email, emailDomains: emailDomains || [], contactPerson, phone, color: color || '#6B7280' });
    res.status(201).json(vendor);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Vendor email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { name, email, emailDomains, contactPerson, phone, color, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (emailDomains !== undefined) update.emailDomains = emailDomains;
    if (contactPerson !== undefined) update.contactPerson = contactPerson;
    if (phone !== undefined) update.phone = phone;
    if (color !== undefined) update.color = color;
    if (isActive !== undefined) update.isActive = isActive;
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
