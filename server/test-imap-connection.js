// Quick test script to verify Gmail IMAP connection
// Run: node test-imap-connection.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Imap = require('imap');

console.log('Testing IMAP connection with:');
console.log('Host:', process.env.IMAP_HOST);
console.log('User:', process.env.IMAP_USER);
console.log('Port:', process.env.IMAP_PORT);
console.log('---');

const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT || '993'),
  tls: process.env.IMAP_TLS !== 'false',
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ SUCCESS! IMAP connection established.');
  console.log('Your Gmail is configured correctly for email ingestion.');
  
  // Try to open inbox
  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('❌ Error opening inbox:', err.message);
    } else {
      console.log('✅ Inbox accessible');
      console.log(`📧 Total messages in inbox: ${box.messages.total}`);
      console.log(`📬 Unread messages: ${box.messages.new}`);
    }
    imap.end();
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP connection FAILED!');
  console.error('Error:', err.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check that IMAP_PASSWORD in .env is your Gmail App Password (not your regular password)');
  console.error('2. Ensure you have enabled 2-Factor Authentication on your Google account');
  console.error('3. Generate App Password at: https://myaccount.google.com/apppasswords');
  console.error('4. Enable IMAP in Gmail: Settings > Forwarding and POP/IMAP > Enable IMAP');
  console.error('5. Remove any spaces from the App Password in .env file');
});

imap.once('end', () => {
  console.log('\nConnection closed.');
  process.exit(0);
});

console.log('Connecting to Gmail IMAP...\n');
imap.connect();

// Timeout after 15 seconds
setTimeout(() => {
  console.error('\n❌ Connection timeout after 15 seconds');
  console.error('Check your internet connection and Gmail IMAP settings');
  process.exit(1);
}, 15000);
