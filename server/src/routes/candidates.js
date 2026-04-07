const express = require('express');
const Candidate = require('../models/Candidate');
const PipelineHistory = require('../models/PipelineHistory');
const InterviewFeedback = require('../models/InterviewFeedback');
const { authenticate, authorize, vendorScope } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { manualIngest } = require('../services/emailIngestion');

const router = express.Router();

router.get('/', authenticate, vendorScope, async (req, res) => {
  try {
    const { status, vendorId, search, isDuplicate, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (req.vendorId) { filter.sourceVendor = req.vendorId; }
    else if (vendorId) { filter.sourceVendor = vendorId; }
    if (status) filter.status = status;
    if (isDuplicate === 'true') filter.isDuplicate = true;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { currentTitle: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(filter).populate('sourceVendor', 'name color').sort({ submittedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Candidate.countDocuments(filter),
    ]);
    const result = candidates.map(c => ({
      ...c, id: c._id, vendor_name: c.sourceVendor?.name, vendor_color: c.sourceVendor?.color,
      full_name: c.fullName, current_title: c.currentTitle, is_duplicate: c.isDuplicate,
      submitted_at: c.submittedAt, source_vendor_id: c.sourceVendor?._id,
    }));
    res.json({ candidates: result, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, vendorScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.vendorId) filter.sourceVendor = req.vendorId;
    const candidate = await Candidate.findOne(filter).populate('sourceVendor', 'name color').lean();
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    const [history, feedback] = await Promise.all([
      PipelineHistory.find({ candidate: candidate._id }).populate('changedBy', 'fullName').sort({ createdAt: 1 }).lean(),
      InterviewFeedback.find({ candidate: candidate._id }).populate('interviewer', 'fullName').sort({ createdAt: 1 }).lean(),
    ]);
    res.json({
      ...candidate, id: candidate._id, full_name: candidate.fullName, current_title: candidate.currentTitle,
      current_company: candidate.currentCompany, experience_years: candidate.experienceYears,
      is_duplicate: candidate.isDuplicate, submitted_at: candidate.submittedAt,
      resume_file_path: candidate.resumeFilePath, resume_file_name: candidate.resumeFileName,
      vendor_name: candidate.sourceVendor?.name, vendor_color: candidate.sourceVendor?.color,
      resume_text: candidate.resumeText, rejection_stage: candidate.rejectionStage,
      pipelineHistory: history.map(h => ({ ...h, id: h._id, from_status: h.fromStatus, to_status: h.toStatus, changed_by_name: h.changedBy?.fullName, created_at: h.createdAt })),
      feedback: feedback.map(f => ({ ...f, id: f._id, interviewer_name: f.interviewer?.fullName, created_at: f.createdAt })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', authenticate, authorize('admin', 'recruiter'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Resume file is required' });
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ error: 'Vendor ID is required' });
    const candidate = await manualIngest(req.file.path, req.file.originalname, vendorId);
    res.status(201).json(candidate);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { fullName, email, phone, skills, experienceYears, currentTitle, currentCompany, location, notes } = req.body;
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (skills !== undefined) update.skills = skills;
    if (experienceYears !== undefined) update.experienceYears = experienceYears;
    if (currentTitle !== undefined) update.currentTitle = currentTitle;
    if (currentCompany !== undefined) update.currentCompany = currentCompany;
    if (location !== undefined) update.location = location;
    if (notes !== undefined) update.notes = notes;
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/feedback', authenticate, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { stage, rating, strengths, weaknesses, recommendation, notes } = req.body;
    const feedback = await InterviewFeedback.create({
      candidate: req.params.id, stage, interviewer: req.user.id,
      rating, strengths, weaknesses, recommendation, notes,
    });
    res.status(201).json(feedback);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
