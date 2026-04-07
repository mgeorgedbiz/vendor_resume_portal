const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const PipelineHistory = require('../models/PipelineHistory');

async function seed() {
  logger.info('Seeding database...');

  const vendors = [
    { name: 'TechSupply', email: 'techsupply@techsupply.com', emailDomains: ['techsupply.com'], color: '#3B82F6', contactPerson: 'Alice Johnson' },
    { name: 'CodeRecruit', email: 'hr@coderecruit.io', emailDomains: ['coderecruit.io'], color: '#8B5CF6', contactPerson: 'Bob Smith' },
    { name: 'TalentBridge', email: 'resumes@talentbridge.com', emailDomains: ['talentbridge.com'], color: '#F59E0B', contactPerson: 'Carol Davis' },
    { name: 'SwiftHire', email: 'submissions@swifthire.com', emailDomains: ['swifthire.com'], color: '#10B981', contactPerson: 'Dan Wilson' },
    { name: 'HireNow', email: 'candidates@hirenow.co', emailDomains: ['hirenow.co'], color: '#EF4444', contactPerson: 'Eve Martinez' },
  ];

  const vendorDocs = [];
  for (const v of vendors) {
    const doc = await Vendor.findOneAndUpdate({ email: v.email }, v, { upsert: true, new: true });
    vendorDocs.push(doc);
  }

  const adminHash = await bcrypt.hash('admin123', 12);
  await User.findOneAndUpdate({ email: 'admin@yourcompany.com' },
    { email: 'admin@yourcompany.com', passwordHash: adminHash, fullName: 'Admin User', role: 'admin' },
    { upsert: true, new: true });

  const recruiterHash = await bcrypt.hash('recruiter123', 12);
  await User.findOneAndUpdate({ email: 'recruiter@yourcompany.com' },
    { email: 'recruiter@yourcompany.com', passwordHash: recruiterHash, fullName: 'Sarah Recruiter', role: 'recruiter' },
    { upsert: true, new: true });

  const vendorHash = await bcrypt.hash('vendor123', 12);
  for (const v of vendorDocs) {
    const portalEmail = 'portal@' + v.name.toLowerCase() + '.com';
    await User.findOneAndUpdate({ email: portalEmail },
      { email: portalEmail, passwordHash: vendorHash, fullName: v.name + ' Portal', role: 'vendor', vendorId: v._id },
      { upsert: true, new: true });
  }

  const findVendor = (name) => vendorDocs.find(v => v.name === name)?._id;

  const candidates = [
    { name: 'Arjun Menon', title: 'Backend engineer', vendor: 'TechSupply', status: 'screening', daysAgo: 1 },
    { name: 'Priya Nair', title: 'React developer', vendor: 'HireNow', status: 'screening', daysAgo: 2 },
    { name: 'Samuel Okafor', title: 'DevOps engineer', vendor: 'TalentBridge', status: 'screening', daysAgo: 3 },
    { name: 'Kavya Raj', title: 'Full-stack dev', vendor: 'CodeRecruit', status: 'l1_review', daysAgo: 4 },
    { name: 'Rahul Sharma', title: 'Backend developer', vendor: 'SwiftHire', status: 'l1_review', daysAgo: 2 },
    { name: 'Divya Pillai', title: 'Cloud architect', vendor: 'TechSupply', status: 'l1_review', daysAgo: 5 },
    { name: 'Tom Wanjiku', title: 'ML engineer', vendor: 'HireNow', status: 'l1_review', daysAgo: 1 },
    { name: 'Sneha Iyer', title: 'React developer', vendor: 'TalentBridge', status: 'l2_review', daysAgo: 3 },
    { name: 'Arun Kumar', title: 'API developer', vendor: 'CodeRecruit', status: 'l2_review', daysAgo: 6 },
    { name: 'Riya Thomas', title: 'QA engineer', vendor: 'TechSupply', status: 'selected', daysAgo: 8 },
    { name: 'Vijay Nambiar', title: 'Backend engineer', vendor: 'SwiftHire', status: 'selected', daysAgo: 10 },
    { name: 'Anjali Shetty', title: 'Full-stack dev', vendor: 'HireNow', status: 'rejected', daysAgo: 7, rejectionStage: 'l1_review' },
  ];

  for (const c of candidates) {
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - c.daysAgo);
    const existing = await Candidate.findOne({ fullName: c.name, sourceVendor: findVendor(c.vendor) });
    if (!existing) {
      const candidate = await Candidate.create({
        fullName: c.name, currentTitle: c.title, sourceVendor: findVendor(c.vendor),
        status: c.status, rejectionStage: c.rejectionStage || null, submittedAt,
        skills: ['JavaScript', 'Node.js', 'React'],
      });
      await PipelineHistory.create({ candidate: candidate._id, toStatus: c.status, notes: 'Seeded data' });
    }
  }

  logger.info('Seed completed successfully');
}

if (require.main === module) {
  const envPath = require('path').resolve(__dirname, '../../../.env');
  const envExamplePath = require('path').resolve(__dirname, '../../../.env.example');
  require('dotenv').config({ path: require('fs').existsSync(envPath) ? envPath : envExamplePath });
  const { connectDB } = require('./pool');
  connectDB().then(() => seed()).then(() => { process.exit(0); }).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seed };
