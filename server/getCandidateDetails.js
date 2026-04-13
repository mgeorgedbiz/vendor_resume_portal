// Get specific candidate details
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function getCandidateDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false, strictPopulate: false }));
    const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
    
    const candidate = await Candidate.findById('69d61ae24476ef0de806ed54').lean();
    
    if (!candidate) {
      console.log('❌ Candidate not found');
      return;
    }

    const vendor = await Vendor.findById(candidate.sourceVendor);

    console.log('✅ Candidate Found!\n');
    console.log('═══════════════════════════════════════');
    console.log('ID:', candidate._id);
    console.log('Name:', candidate.fullName);
    console.log('Email:', candidate.email || 'N/A');
    console.log('Phone:', candidate.phone || 'N/A');
    console.log('Status:', candidate.status);
    console.log('Current Title:', candidate.currentTitle || 'N/A');
    console.log('Company:', candidate.currentCompany || 'N/A');
    console.log('Experience:', candidate.experienceYears || 'N/A');
    console.log('Skills:', candidate.skills?.join(', ') || 'N/A');
    console.log('Location:', candidate.location || 'N/A');
    console.log('Resume File:', candidate.resumeFileName);
    console.log('Vendor:', vendor?.name || 'Unknown');
    console.log('Vendor ID:', candidate.sourceVendor);
    console.log('Is Duplicate:', candidate.isDuplicate || false);
    console.log('Created:', candidate.createdAt);
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

getCandidateDetails();
