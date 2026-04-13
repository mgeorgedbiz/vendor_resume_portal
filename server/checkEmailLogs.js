// Check email ingestion logs
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email ingestion logs
    const EmailIngestionLog = mongoose.model('EmailIngestionLog', new mongoose.Schema({}, { strict: false }));
    
    const logs = await EmailIngestionLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`📧 Email Ingestion Logs (last 10):`);
    console.log('─────────────────────────────────────────');
    
    if (logs.length === 0) {
      console.log('No email ingestion logs found');
    } else {
      logs.forEach((log, i) => {
        console.log(`\n${i + 1}. ${log.status?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   From: ${log.fromEmail}`);
        console.log(`   Subject: ${log.subject || 'N/A'}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Error: ${log.errorMessage || 'None'}`);
        console.log(`   Vendor: ${log.vendor || 'None'}`);
        console.log(`   Candidate: ${log.candidate || 'None'}`);
        console.log(`   Date: ${log.createdAt}`);
      });
    }

    // Check all candidates
    const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false }));
    const allCandidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sourceVendor')
      .lean();

    console.log('\n\n📋 Recent Candidates (last 5):');
    console.log('─────────────────────────────────────────');
    
    if (allCandidates.length === 0) {
      console.log('No candidates found');
    } else {
      allCandidates.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.fullName}`);
        console.log(`   Email: ${c.email || 'N/A'}`);
        console.log(`   Status: ${c.status}`);
        console.log(`   Vendor: ${c.sourceVendor?.name || 'Unknown'} (${c.sourceVendor})`);
        console.log(`   Created: ${c.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkLogs();
