// Script to create a test vendor for email ingestion
// Run: node create-test-vendor.js

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: String,
  email: String,
  emailDomains: [String],
  allowedEmails: [String],
  contactPerson: String,
  phone: String,
  color: String,
  isActive: Boolean,
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', vendorSchema);

async function createTestVendor() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Check if vendor already exists
    const existing = await Vendor.findOne({ 
      $or: [
        { allowedEmails: 'dbizvendortag@gmail.com' },
        { name: 'Gmail Test Vendor' }
      ]
    });

    if (existing) {
      console.log('⚠️  Test vendor already exists:');
      console.log(JSON.stringify(existing, null, 2));
      console.log('\nIf you want to update it, delete it first or modify via API.');
      process.exit(0);
    }

    // Create new test vendor
    const vendor = await Vendor.create({
      name: 'Gmail Test Vendor',
      email: 'dbizvendortag@gmail.com',
      emailDomains: [], // Could add ['gmail.com'] to accept all Gmail addresses
      allowedEmails: ['dbizvendortag@gmail.com'], // Only this specific email
      contactPerson: 'Test Contact',
      phone: '123-456-7890',
      color: '#3B82F6',
      isActive: true
    });

    console.log('✅ Test vendor created successfully!\n');
    console.log('Vendor Details:');
    console.log('─────────────────────────────────');
    console.log('ID:', vendor._id);
    console.log('Name:', vendor.name);
    console.log('Email:', vendor.email);
    console.log('Allowed Emails:', vendor.allowedEmails);
    console.log('Active:', vendor.isActive);
    console.log('─────────────────────────────────\n');

    console.log('✅ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Send a test email TO dbizvendortag@gmail.com FROM dbizvendortag@gmail.com');
    console.log('2. Attach a resume file (PDF or DOCX)');
    console.log('3. Start the email ingestion listener');
    console.log('4. Check the logs to see if it was processed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('Vendor email already exists in database.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  }
}

createTestVendor();
