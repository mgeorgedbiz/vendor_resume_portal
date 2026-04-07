const mongoose = require('mongoose');

const STATUSES = ['screening', 'l1_review', 'l2_review', 'selected', 'rejected'];

const candidateSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, lowercase: true },
  phone: String,
  skills: [String],
  experienceYears: Number,
  currentTitle: String,
  currentCompany: String,
  location: String,
  resumeText: String,
  resumeFilePath: String,
  resumeFileName: String,
  sourceVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  status: { type: String, enum: STATUSES, default: 'screening' },
  rejectionStage: String,
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
  isDuplicate: { type: Boolean, default: false },
  notes: String,
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

candidateSchema.index({ status: 1 });
candidateSchema.index({ sourceVendor: 1 });
candidateSchema.index({ email: 1 });
candidateSchema.index({ fullName: 'text' });
candidateSchema.index({ isDuplicate: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
