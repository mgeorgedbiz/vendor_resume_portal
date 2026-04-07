const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  emailDomains: [{ type: String, lowercase: true }],
  contactPerson: String,
  phone: String,
  color: { type: String, default: '#6B7280' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

vendorSchema.index({ emailDomains: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
