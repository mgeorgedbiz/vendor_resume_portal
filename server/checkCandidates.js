const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const candidateSchema = new mongoose.Schema({}, { strict: false });
const Candidate = mongoose.model('Candidate', candidateSchema);

async function checkCandidates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!\n');

    const vendorId = '69d6040200e9bceba6cda872';
    
    // Try different query formats
    console.log('=== CHECKING CANDIDATES FOR GMAIL VENDOR ===');
    console.log(`Vendor ID: ${vendorId}\n`);
    
    // Query 1: String match
    const candidates1 = await Candidate.find({ sourceVendor: vendorId }).lean();
    console.log(`Query 1 (string match): ${candidates1.length} candidates`);
    
    // Query 2: ObjectId match
    const candidates2 = await Candidate.find({ 
      sourceVendor: new mongoose.Types.ObjectId(vendorId) 
    }).lean();
    console.log(`Query 2 (ObjectId match): ${candidates2.length} candidates`);
    
    // Query 3: Get all recent candidates
    console.log('\n=== RECENT CANDIDATES (Last 5) ===');
    const recentCandidates = await Candidate.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
      
    recentCandidates.forEach((candidate, index) => {
      console.log(`\nCandidate #${index + 1}:`);
      console.log(`  ID: ${candidate._id}`);
      console.log(`  Full Name: ${candidate.fullName || 'N/A'}`);
      console.log(`  Email: ${candidate.email || 'N/A'}`);
      console.log(`  Status: ${candidate.status || 'N/A'}`);
      console.log(`  Source Vendor ID: ${candidate.sourceVendor}`);
      console.log(`  Source Vendor Type: ${typeof candidate.sourceVendor}`);
      console.log(`  Resume Path: ${candidate.resumePath || 'N/A'}`);
      console.log(`  Created At: ${candidate.createdAt || 'N/A'}`);
    });
    
    // Show full document for the most recent one
    if (recentCandidates.length > 0) {
      console.log('\n\n=== FULL DOCUMENT FOR MOST RECENT CANDIDATE ===');
      console.log(JSON.stringify(recentCandidates[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n\nDatabase connection closed.');
  }
}

checkCandidates();
