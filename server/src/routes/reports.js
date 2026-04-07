const express = require('express');
const Candidate = require('../models/Candidate');
const Vendor = require('../models/Vendor');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/vendor-analytics', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    const stats = await Candidate.aggregate([
      { $group: { _id: '$sourceVendor', total_submitted: { $sum: 1 },
        in_screening: { $sum: { $cond: [{ $eq: ['$status', 'screening'] }, 1, 0] } },
        in_l1: { $sum: { $cond: [{ $eq: ['$status', 'l1_review'] }, 1, 0] } },
        in_l2: { $sum: { $cond: [{ $eq: ['$status', 'l2_review'] }, 1, 0] } },
        selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        duplicates: { $sum: { $cond: ['$isDuplicate', 1, 0] } },
      }}
    ]);
    const statsMap = {};
    for (const s of stats) { statsMap[s._id?.toString()] = s; }
    const result = vendors.map(v => {
      const s = statsMap[v._id.toString()] || {};
      const total = s.total_submitted || 0;
      const selected = s.selected || 0;
      return { id: v._id, name: v.name, color: v.color, contact_person: v.contactPerson,
        total_submitted: total, in_screening: s.in_screening || 0, in_l1: s.in_l1 || 0,
        in_l2: s.in_l2 || 0, selected, rejected: s.rejected || 0, duplicates: s.duplicates || 0,
        selection_rate: total > 0 ? Math.round((selected / total) * 1000) / 10 : 0 };
    });
    result.sort((a, b) => b.total_submitted - a.total_submitted);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pipeline-funnel', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const counts = await Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const c = {};
    for (const s of counts) c[s._id] = s.count;
    const total = Object.values(c).reduce((sum, v) => sum + v, 0);
    const passedScreening = (c.l1_review || 0) + (c.l2_review || 0) + (c.selected || 0);
    const passedL1 = (c.l2_review || 0) + (c.selected || 0);
    res.json({ total, passed_screening: passedScreening, passed_l1: passedL1,
      passed_l2: c.selected || 0, selected: c.selected || 0, rejected: c.rejected || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/timeline', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    const result = await Candidate.aggregate([
      { $match: { submittedAt: { $gte: since } } },
      { $lookup: { from: 'vendors', localField: 'sourceVendor', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        vendorName: '$vendor.name', vendorColor: '$vendor.color' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]);
    res.json(result.map(r => ({ date: r._id.date, vendor_name: r._id.vendorName, vendor_color: r._id.vendorColor, count: r.count })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
