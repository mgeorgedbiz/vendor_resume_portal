# Email Whitelist Configuration Guide

## Overview
The email ingestion service now supports restricting attachments to specific email addresses. There are two ways to configure this:

## Option 1: Global Allowed Emails (Environment Variable)

Set the `ALLOWED_EMAILS` environment variable with a comma-separated list of allowed email addresses:

```env
ALLOWED_EMAILS=vendor1@example.com,vendor2@company.com,hr@recruiting.com
```

**How it works:**
- If `ALLOWED_EMAILS` is set, ONLY emails from these addresses will be processed
- All other emails will be rejected with status "rejected"
- If not set, the system falls back to vendor-based validation (Option 2)

**Example (.env file):**
```env
ALLOWED_EMAILS=john@techcorp.com,jane@staffing.com
```

## Option 2: Per-Vendor Allowed Emails (Database)

Add specific email addresses to each vendor's `allowedEmails` array. This provides fine-grained control per vendor.

### Adding Allowed Emails via MongoDB

```javascript
// Update a vendor with allowed emails
db.vendors.updateOne(
  { name: "TechCorp Staffing" },
  { 
    $set: { 
      allowedEmails: [
        "recruiter1@techcorp.com",
        "recruiter2@techcorp.com",
        "hr@techcorp.com"
      ]
    }
  }
)
```

### Adding Allowed Emails via API

You'll need to update your vendor API endpoint to support the `allowedEmails` field:

```bash
# Update vendor with allowed emails
curl -X PUT http://localhost:5000/api/vendors/:vendorId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedEmails": [
      "recruiter1@techcorp.com",
      "recruiter2@techcorp.com"
    ]
  }'
```

## How Email Validation Works

The system validates emails in this order:

1. **Global Check**: If `ALLOWED_EMAILS` is set, check if sender is in the global list
   - If NOT in list → Reject email (status: "rejected")
   - If in list → Continue to step 2

2. **Vendor Match by Specific Email**: Check if sender email matches any vendor's `allowedEmails`
   - If match found → Process email from that vendor

3. **Vendor Match by Domain**: Check if sender's domain matches any vendor's `emailDomains`
   - If match found → Process email from that vendor

4. **No Match**: Reject email (status: "failed", message: "Unknown vendor or email not allowed")

## Examples

### Example 1: Strict Global Whitelist
```env
# Only these 3 emails can send resumes
ALLOWED_EMAILS=alice@vendor1.com,bob@vendor2.com,charlie@vendor3.com
```

### Example 2: Per-Vendor Control
Leave `ALLOWED_EMAILS` unset, and configure each vendor:

```javascript
// Vendor 1: Only 2 specific recruiters can send
{
  name: "TechCorp",
  emailDomains: ["techcorp.com"],
  allowedEmails: ["recruiter1@techcorp.com", "recruiter2@techcorp.com"]
}

// Vendor 2: Anyone from the domain can send
{
  name: "StaffingPro",
  emailDomains: ["staffingpro.com"],
  allowedEmails: [] // Empty means accept all from domain
}
```

### Example 3: Hybrid Approach
```env
# Global whitelist narrows down to specific emails
ALLOWED_EMAILS=recruiter1@techcorp.com,hr@staffing.com,john@vendor.com
```

Then configure vendors normally - only emails in BOTH the global list AND vendor config will be accepted.

## Monitoring Rejected Emails

Check the email ingestion logs to see rejected emails:

```bash
GET /api/email-ingestion/log?status=rejected
```

Rejected emails will have:
- `status`: "rejected" (for global whitelist rejection)
- `status`: "failed" (for vendor not found)
- `errorMessage`: Explanation of why it was rejected

## Security Best Practices

1. **Use specific emails, not domains** for sensitive environments
2. **Regularly audit** the allowed emails list
3. **Monitor logs** for rejected emails to detect unauthorized attempts
4. **Rotate credentials** if you suspect compromise
5. **Use environment variables** for production, not hardcoded values

## Troubleshooting

### Emails not being processed?
1. Check if `ALLOWED_EMAILS` is set - it overrides vendor settings
2. Verify email address spelling (case doesn't matter, but typos do)
3. Check email ingestion logs: `GET /api/email-ingestion/log`
4. Ensure vendor is marked as `isActive: true`

### How to disable whitelist?
Remove or comment out the `ALLOWED_EMAILS` environment variable:
```env
# ALLOWED_EMAILS=  # Commented out - accepts all vendor emails
```

## Migration Guide

If you have existing vendors, you may want to populate `allowedEmails`:

```javascript
// MongoDB script to migrate existing vendors
db.vendors.find().forEach(vendor => {
  if (!vendor.allowedEmails) {
    // Set allowedEmails to empty array (accepts all from domain)
    db.vendors.updateOne(
      { _id: vendor._id },
      { $set: { allowedEmails: [] } }
    )
  }
})
```
