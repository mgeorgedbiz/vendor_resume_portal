const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Vendor = require('../models/Vendor');
const Candidate = require('../models/Candidate');
const PipelineHistory = require('../models/PipelineHistory');
const EmailIngestionLog = require('../models/EmailIngestionLog');
const resumeParser = require('./resumeParser');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Parse allowed emails from environment variable
function getGlobalAllowedEmails() {
  const envEmails = process.env.ALLOWED_EMAILS || '';
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function identifyVendor(fromEmail) {
  const normalizedEmail = fromEmail.toLowerCase();
  
  // First, check if email matches by specific allowed email
  const vendorByEmail = await Vendor.findOne({ 
    allowedEmails: normalizedEmail, 
    isActive: true 
  });
  if (vendorByEmail) return vendorByEmail;
  
  // Then check by domain
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return Vendor.findOne({ emailDomains: domain, isActive: true });
}

async function isAlreadyProcessed(messageId) {
  if (!messageId) return false;
  const doc = await EmailIngestionLog.findOne({ messageId, status: 'processed' });
  return !!doc;
}

function saveAttachment(attachment) {
  ensureUploadDir();
  const ext = path.extname(attachment.filename || '').toLowerCase();
  if (!['.pdf', '.docx', '.doc'].includes(ext)) return null;
  const uniqueName = crypto.randomUUID() + ext;
  const filePath = path.join(UPLOAD_DIR, uniqueName);
  fs.writeFileSync(filePath, attachment.content);
  return { originalName: attachment.filename, savedPath: filePath, relativePath: 'uploads/' + uniqueName, ext };
}

async function checkDuplicate(candidateData) {
  if (!candidateData.email) return { isDuplicate: false, duplicateOf: null };
  const existing = await Candidate.findOne({ email: candidateData.email, isDuplicate: false }).sort({ createdAt: 1 });
  if (existing) return { isDuplicate: true, duplicateOf: existing._id };
  return { isDuplicate: false, duplicateOf: null };
}

async function processEmail(parsed) {
  const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
  const messageId = parsed.messageId;
  const subject = parsed.subject || '(no subject)';
  if (!fromEmail) { logger.warn('Email has no sender address, skipping'); return; }
  if (await isAlreadyProcessed(messageId)) { logger.info('Email ' + messageId + ' already processed'); return; }

  // Check global allowed emails list (if configured)
  const globalAllowedEmails = getGlobalAllowedEmails();
  if (globalAllowedEmails.length > 0 && !globalAllowedEmails.includes(fromEmail)) {
    await EmailIngestionLog.create({ 
      messageId, fromEmail, subject, 
      status: 'rejected', 
      errorMessage: 'Email not in allowed list' 
    });
    logger.warn('Email rejected - not in allowed list: ' + fromEmail);
    return;
  }

  const vendor = await identifyVendor(fromEmail);
  if (!vendor) {
    await EmailIngestionLog.create({ messageId, fromEmail, subject, status: 'failed', errorMessage: 'Unknown vendor or email not allowed' });
    logger.warn('Unknown vendor or unauthorized email: ' + fromEmail);
    return;
  }

  const attachments = parsed.attachments || [];
  const resumeAttachments = attachments.filter(a => ['.pdf', '.docx', '.doc'].includes(path.extname(a.filename || '').toLowerCase()));
  if (resumeAttachments.length === 0) {
    await EmailIngestionLog.create({ messageId, fromEmail, subject, vendor: vendor._id, status: 'failed', errorMessage: 'No resume attachments found' });
    return;
  }

  for (const attachment of resumeAttachments) {
    try {
      const fileInfo = saveAttachment(attachment);
      if (!fileInfo) continue;
      const candidateData = await resumeParser.parseResume(fileInfo.savedPath, fileInfo.ext);
      const duplicateCheck = await checkDuplicate(candidateData);
      const candidate = await Candidate.create({
        fullName: candidateData.fullName || 'Unknown', email: candidateData.email, phone: candidateData.phone,
        skills: candidateData.skills || [], experienceYears: candidateData.experienceYears,
        currentTitle: candidateData.currentTitle, currentCompany: candidateData.currentCompany,
        location: candidateData.location, resumeText: candidateData.rawText,
        resumeFilePath: fileInfo.relativePath, resumeFileName: fileInfo.originalName,
        sourceVendor: vendor._id, status: 'screening',
        isDuplicate: duplicateCheck.isDuplicate, duplicateOf: duplicateCheck.duplicateOf,
      });
      await PipelineHistory.create({ candidate: candidate._id, toStatus: 'screening', notes: 'Submitted by ' + vendor.name + ' via email' });
      await EmailIngestionLog.create({ messageId, fromEmail, subject, vendor: vendor._id, candidate: candidate._id, status: 'processed', processedAt: new Date() });
      logger.info('Processed resume: ' + (candidateData.fullName || fileInfo.originalName) + ' from ' + vendor.name);
    } catch (err) {
      logger.error('Failed to process attachment ' + attachment.filename + ':', err);
      await EmailIngestionLog.create({ messageId, fromEmail, subject, vendor: vendor._id, status: 'failed', errorMessage: err.message });
    }
  }
}

function startImapListener(config) {
  const imapConfig = {
    user: config.user || process.env.IMAP_USER,
    password: config.password || process.env.IMAP_PASSWORD,
    host: config.host || process.env.IMAP_HOST,
    port: parseInt(config.port || process.env.IMAP_PORT || '993'),
    tls: config.tls !== false,
    tlsOptions: { rejectUnauthorized: false }
  };
  if (!imapConfig.host || !imapConfig.user) { logger.info('IMAP not configured'); return null; }
  const imap = new Imap(imapConfig);
  imap.once('ready', () => { logger.info('IMAP connected'); pollInbox(imap); });
  imap.once('error', (err) => { logger.error('IMAP error:', err); });
  imap.connect();
  return imap;
}

function pollInbox(imap) {
  imap.openBox('INBOX', false, (err) => {
    if (err) { logger.error('Error opening inbox:', err); return; }
    imap.search(['UNSEEN'], (err, results) => {
      if (err || !results || results.length === 0) {
        setTimeout(() => pollInbox(imap), 60000);
        return;
      }
      const fetch = imap.fetch(results, { bodies: '', markSeen: true });
      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) { logger.error('Error parsing email:', err); return; }
            await processEmail(parsed);
          });
        });
      });
      fetch.once('end', () => { setTimeout(() => pollInbox(imap), 60000); });
    });
  });
}

async function manualIngest(filePath, fileName, vendorId) {
  ensureUploadDir();
  const ext = path.extname(fileName).toLowerCase();
  const uniqueName = crypto.randomUUID() + ext;
  const destPath = path.join(UPLOAD_DIR, uniqueName);
  fs.copyFileSync(filePath, destPath);
  const candidateData = await resumeParser.parseResume(destPath, ext);
  const duplicateCheck = await checkDuplicate(candidateData);
  const candidate = await Candidate.create({
    fullName: candidateData.fullName || 'Unknown', email: candidateData.email, phone: candidateData.phone,
    skills: candidateData.skills || [], experienceYears: candidateData.experienceYears,
    currentTitle: candidateData.currentTitle, currentCompany: candidateData.currentCompany,
    location: candidateData.location, resumeText: candidateData.rawText,
    resumeFilePath: 'uploads/' + uniqueName, resumeFileName: fileName,
    sourceVendor: vendorId, status: 'screening',
    isDuplicate: duplicateCheck.isDuplicate, duplicateOf: duplicateCheck.duplicateOf,
  });
  await PipelineHistory.create({ candidate: candidate._id, toStatus: 'screening', notes: 'Manually uploaded' });
  return candidate;
}

module.exports = { processEmail, startImapListener, manualIngest, identifyVendor };
