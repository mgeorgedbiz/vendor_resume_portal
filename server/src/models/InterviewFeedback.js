const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  stage: { type: String, required: true, enum: ['screening', 'l1_review', 'l2_review', 'final'] },
  interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, min: 1, max: 5 },
  strengths: String,
  weaknesses: String,
  recommendation: { type: String, enum: ['strong_yes', 'yes', 'maybe', 'no', 'strong_no'] },
  notes: String,
}, { timestamps: true });

interviewFeedbackSchema.index({ candidate: 1 });

module.exports = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
