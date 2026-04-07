const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  type: { type: String, required: true },
  subject: String,
  body: String,
  recipientEmail: String,
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: Date,
}, { timestamps: true });

notificationSchema.index({ vendor: 1 });
notificationSchema.index({ status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
