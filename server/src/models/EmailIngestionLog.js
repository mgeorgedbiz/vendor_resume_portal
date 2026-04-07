const mongoose = require('mongoose');

const emailIngestionLogSchema = new mongoose.Schema({
  messageId: String,
  fromEmail: { type: String, lowercase: true },
  subject: String,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  status: { type: String, enum: ['pending', 'processed', 'failed', 'duplicate'], default: 'pending' },
  errorMessage: String,
  rawMetadata: mongoose.Schema.Types.Mixed,
  processedAt: Date,
}, { timestamps: true });

emailIngestionLogSchema.index({ messageId: 1 });
emailIngestionLogSchema.index({ status: 1 });

module.exports = mongoose.model('EmailIngestionLog', emailIngestionLogSchema);
