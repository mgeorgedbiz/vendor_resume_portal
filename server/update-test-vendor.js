// Update test vendor to accept mglearning0@gmail.com
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
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

async function updateVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const result = await Vendor.updateOne(
      { name: 'Gmail Test Vendor' },
      { $set: { allowedEmails: ['dbizvendortag@gmail.com', 'mglearning0@gmail.com'] } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ No vendor found with name "Gmail Test Vendor"');
    } else {
      console.log('✅ Vendor updated successfully!');
      const vendor = await Vendor.findOne({ name: 'Gmail Test Vendor' });
      console.log('\nUpdated vendor:');
      console.log('Name:', vendor.name);
      console.log('Allowed Emails:', vendor.allowedEmails);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

updateVendor();
