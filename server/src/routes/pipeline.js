const express = require('express');
const Candidate = require('../models/Candidate');
const PipelineHistory = require('../models/PipelineHistory');
const { authenticate, authorize } = require('../middleware/auth');
const { notifyVendorStatusChange } = require('../services/notificationService');

const router = express.Router();

const VALID_STATUSES = ['screening', 'l1_review', 'l2_review', 'selected', 'rejected'];
const VALID_TRANSITIONS = {
  screening: ['l1_review', 'rejected'],
  l1_review: ['l2_review', 'rejected'],
  l2_review: ['selected', 'rejected'],
  selected: [],
  rejected: [],
};

router.put('/:candidateId/status', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { candidateId } = req.params;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + VALID_STATUSES.join(', ') });
    }
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    const currentStatus = candidate.status;
    if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
      return res.status(400).json({ error: 'Cannot transition from ' + currentStatus + ' to ' + status + '. Valid: ' + (VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none') });
    }
    candidate.status = status;
    if (status === 'rejected') candidate.rejectionStage = currentStatus;
    await candidate.save();
    await PipelineHistory.create({ candidate: candidateId, fromStatus: currentStatus, toStatus: status, changedBy: req.user.id, notes });
    notifyVendorStatusChange(candidateId, currentStatus, status).catch(() => {});
    res.json(candidate);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history/:candidateId', authenticate, async (req, res) => {
  try {
    const history = await PipelineHistory.find({ candidate: req.params.candidateId })
      .populate('changedBy', 'fullName').sort({ createdAt: 1 }).lean();
    res.json(history.map(h => ({ ...h, id: h._id, from_status: h.fromStatus, to_status: h.toStatus, changed_by_name: h.changedBy?.fullName, created_at: h.createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
