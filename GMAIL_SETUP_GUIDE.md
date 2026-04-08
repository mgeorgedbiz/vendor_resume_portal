# Gmail Email Ingestion Setup Guide

## Step 1: Generate Gmail App Password

Since you're using **dbizvendortag@gmail.com**, you need to create an App Password for IMAP access:

### Enable 2-Factor Authentication (if not already enabled)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on **2-Step Verification**
3. Follow the prompts to enable it

### Generate App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on **2-Step Verification**
3. Scroll down and click **App passwords**
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Enter "Resume Vendor System"
6. Click **Generate**
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## Step 2: Update .env File

I've already created your `.env` file. Now update it with your App Password:

```env
IMAP_PASSWORD=YOUR_16_CHARACTER_APP_PASSWORD
SMTP_PASSWORD=YOUR_16_CHARACTER_APP_PASSWORD
```

**Important:** Remove spaces from the App Password (use `abcdefghijklmnop` instead of `abcd efgh ijkl mnop`)

## Step 3: Update MongoDB Connection

Update the `MONGODB_URI` in `.env` with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/resume_vendor?retryWrites=true&w=majority
```

## Step 4: Create Test Vendor

You need at least one vendor in the database to test. Start your server and create a vendor:

### Option A: Via API (Recommended)

```bash
# 1. Start your server
cd server
npm start

# 2. Create an admin user (if not already created)
# Use MongoDB Compass or mongo shell

# 3. Login to get a token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "yourpassword"
  }'

# 4. Create a test vendor with your Gmail account
curl -X POST http://localhost:4000/api/vendors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Vendor",
    "email": "test@example.com",
    "emailDomains": ["gmail.com"],
    "allowedEmails": ["dbizvendortag@gmail.com"],
    "contactPerson": "Test Contact",
    "phone": "123-456-7890"
  }'
```

### Option B: Via MongoDB Directly

```javascript
// Connect to your MongoDB and run:
db.vendors.insertOne({
  name: "Test Vendor",
  email: "test@example.com",
  emailDomains: ["gmail.com"],
  allowedEmails: ["dbizvendortag@gmail.com"],
  contactPerson: "Test Contact",
  phone: "123-456-7890",
  color: "#6B7280",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Step 5: Start Email Ingestion

### Start the IMAP listener:

```bash
# Via API (after server is running)
curl -X POST http://localhost:4000/api/email-ingestion/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Or add auto-start to server code:

Add this to `server/src/index.js` after the database connection:

```javascript
// Auto-start email ingestion
const { startImapListener } = require('./services/emailIngestion');
connectDB().then(() => {
  logger.info('Database connected');
  // Start IMAP listener
  if (process.env.IMAP_HOST && process.env.IMAP_USER) {
    startImapListener({});
    logger.info('Email ingestion auto-started');
  }
}).catch(err => {
  logger.error('Failed to connect to database:', err);
  process.exit(1);
});
```

## Step 6: Send Test Email

1. **From another email account** (not dbizvendortag@gmail.com), send an email to **dbizvendortag@gmail.com**
2. **Subject:** Test Resume Submission
3. **Attach:** A PDF or DOCX resume file
4. The system will:
   - Check if sender is in allowed list or matches vendor domain
   - Extract and parse the resume
   - Create a candidate record
   - Log the ingestion

## Step 7: Test From Your Own Account

If you want to test sending FROM dbizvendortag@gmail.com:

1. Update vendor to allow self-sending:
```javascript
db.vendors.updateOne(
  { name: "Test Vendor" },
  { $set: { allowedEmails: ["dbizvendortag@gmail.com"] } }
)
```

2. Send email from dbizvendortag@gmail.com to itself with a resume attached

## Step 8: Monitor Ingestion

Check the logs to see if emails are being processed:

```bash
# View email ingestion logs
curl http://localhost:4000/api/email-ingestion/log \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check server console for real-time logs
```

## Troubleshooting

### "IMAP authentication failed"
- Verify App Password is correct (no spaces)
- Ensure 2FA is enabled on Gmail account
- Check that IMAP is enabled in Gmail settings

### "Unknown vendor or email not allowed"
- Verify vendor exists with `allowedEmails: ["dbizvendortag@gmail.com"]`
- Or set vendor's `emailDomains: ["gmail.com"]` (accepts all Gmail)
- Check if `ALLOWED_EMAILS` env var is set (it overrides vendor settings)

### "No resume attachments found"
- Ensure attached file is .pdf, .docx, or .doc
- Check file size (should be under 10MB)

### Emails not being picked up
- Check Gmail IMAP is enabled: [Gmail Settings](https://mail.google.com/mail/u/0/#settings/fwdandpop)
  - Enable IMAP access
- Verify IMAP connection in server logs
- Check that email is UNREAD in inbox
- System polls every 60 seconds

### Test IMAP Connection

Run this test script to verify IMAP connection:

```javascript
// test-imap.js
const Imap = require('imap');

const imap = new Imap({
  user: 'dbizvendortag@gmail.com',
  password: 'YOUR_APP_PASSWORD',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ IMAP connection successful!');
  imap.end();
});

imap.once('error', (err) => {
  console.error('❌ IMAP connection failed:', err);
});

imap.connect();
```

Run: `node test-imap.js`

## Expected Flow

1. ✅ Email arrives at dbizvendortag@gmail.com
2. ✅ IMAP listener detects unread email (every 60 seconds)
3. ✅ System checks sender against allowed list
4. ✅ System verifies sender matches a vendor
5. ✅ System extracts resume attachment(s)
6. ✅ Resume is parsed and candidate created
7. ✅ Email is marked as read
8. ✅ Log entry created with status "processed"

Check logs: `GET /api/email-ingestion/log`

## Security Best Practices

1. **Never commit `.env` file** - Already in .gitignore
2. **Use App Passwords**, not your main Gmail password
3. **Rotate App Passwords** regularly
4. **Use `allowedEmails`** for production to restrict senders
5. **Monitor logs** for rejected/failed attempts

## Quick Test Checklist

- [ ] App Password generated
- [ ] `.env` file updated with App Password
- [ ] MongoDB connected
- [ ] Test vendor created with allowedEmails
- [ ] Server started
- [ ] IMAP listener started
- [ ] Test email sent with resume attachment
- [ ] Check logs for "processed" status
- [ ] Verify candidate created in database
