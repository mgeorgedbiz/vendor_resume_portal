const nodemailer = require('nodemailer');
const Candidate = require('../models/Candidate');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

const STATUS_LABELS = {
  screening: 'Screening', l1_review: 'L1 Technical Review',
  l2_review: 'L2 Technical Review', selected: 'Selected', rejected: 'Rejected',
};

async function notifyVendorStatusChange(candidateId, fromStatus, toStatus) {
  try {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return;
    const vendor = await Vendor.findById(candidate.sourceVendor);
    if (!vendor) return;

    const toLabel = STATUS_LABELS[toStatus] || toStatus;
    const subject = 'Candidate Update: ' + candidate.fullName + ' - ' + toLabel;

    let body = 'Dear ' + (vendor.contactPerson || vendor.name) + ',\n\n';
    body += 'This is an update regarding the candidate you submitted:\n\n';
    body += 'Candidate: ' + candidate.fullName + '\n';
    if (candidate.currentTitle) body += 'Position: ' + candidate.currentTitle + '\n';
    body += 'New Status: ' + toLabel + '\n';
    if (toStatus === 'rejected') body += 'Rejection Stage: ' + (STATUS_LABELS[candidate.rejectionStage] || 'N/A') + '\n';
    if (toStatus === 'selected') body += '\nCongratulations! The candidate has been selected.\n';
    body += '\nYou can view detailed status on your vendor portal.\n';
    body += '\nBest regards,\nRecruitment Team';

    const notification = await Notification.create({
      vendor: vendor._id, candidate: candidateId, type: 'status_change',
      subject, body, recipientEmail: vendor.email, status: 'pending',
    });

    if (process.env.SMTP_USER) {
      try {
        await getTransporter().sendMail({
          from: process.env.SMTP_FROM || 'noreply@yourcompany.com',
          to: vendor.email, subject, text: body,
        });
        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();
        logger.info('Notification sent to ' + vendor.email);
      } catch (emailErr) {
        logger.error('Failed to send email:', emailErr);
        notification.status = 'failed';
        await notification.save();
      }
    } else {
      logger.info('SMTP not configured. Notification logged for ' + vendor.email);
    }
  } catch (err) {
    logger.error('Error sending vendor notification:', err);
  }
}

module.exports = { notifyVendorStatusChange };
