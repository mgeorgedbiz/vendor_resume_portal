const express = require('express');
const Candidate = require('../models/Candidate');
const PipelineHistory = require('../models/PipelineHistory');
const { authenticate, vendorScope } = require('../middleware/auth');

const router = express.Router();

router.get('/kanban', authenticate, vendorScope, async (req, res) => {
  try {
    const { vendorId } = req.query;
    const filter = {};
    if (req.vendorId) { filter.sourceVendor = req.vendorId; }
    else if (vendorId && vendorId !== 'all') { filter.sourceVendor = vendorId; }
    const candidates = await Candidate.find(filter).populate('sourceVendor', 'name color').sort({ submittedAt: -1 }).lean();
    const kanban = { screening: [], l1_review: [], l2_review: [], selected: [], rejected: [] };
    for (const c of candidates) {
      const card = { id: c._id, full_name: c.fullName, current_title: c.currentTitle, status: c.status,
        submitted_at: c.submittedAt, is_duplicate: c.isDuplicate, skills: c.skills, email: c.email,
        vendor_name: c.sourceVendor?.name, vendor_color: c.sourceVendor?.color };
      if (kanban[c.status]) kanban[c.status].push(card);
    }
    const vendorCount = new Set(candidates.map(c => c.sourceVendor?._id?.toString())).size;
    res.json({ kanban, summary: { totalCandidates: candidates.length, totalVendors: vendorCount,
      screening: kanban.screening.length, l1_review: kanban.l1_review.length,
      l2_review: kanban.l2_review.length, selected: kanban.selected.length, rejected: kanban.rejected.length } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [statusCounts, duplicates, vendorCount] = await Promise.all([
      Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Candidate.countDocuments({ isDuplicate: true }),
      Candidate.distinct('sourceVendor').then(ids => ids.length),
    ]);
    const counts = {}; let total = 0;
    for (const s of statusCounts) { counts[s._id] = s.count; total += s.count; }
    const recentActivity = await PipelineHistory.find().populate('candidate', 'fullName')
      .populate('changedBy', 'fullName').sort({ createdAt: -1 }).limit(10).lean();
    res.json({ total_candidates: total, screening: counts.screening || 0, l1_review: counts.l1_review || 0,
      l2_review: counts.l2_review || 0, selected: counts.selected || 0, rejected: counts.rejected || 0,
      duplicates, active_vendors: vendorCount,
      recentActivity: recentActivity.map(a => ({ ...a, id: a._id, full_name: a.candidate?.fullName,
        changed_by_name: a.changedBy?.fullName, from_status: a.fromStatus, to_status: a.toStatus, created_at: a.createdAt })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
