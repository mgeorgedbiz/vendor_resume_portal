const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../utils/logger');

/**
 * Parse a resume file and extract structured candidate data
 */
async function parseResume(filePath, ext) {
  let rawText = '';

  if (ext === '.pdf') {
    rawText = await extractPdfText(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    rawText = await extractDocxText(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  return extractCandidateInfo(rawText);
}

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  return data.text || '';
}

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

/**
 * Extract structured candidate information from raw resume text
 * Uses regex patterns for common resume fields
 */
function extractCandidateInfo(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    fullName: extractName(lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    experienceYears: extractExperience(text),
    currentTitle: extractTitle(lines),
    currentCompany: null,
    location: extractLocation(text),
    rawText: text.substring(0, 10000) // Store first 10k chars
  };
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text) {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : null;
}

function extractName(lines) {
  // First non-empty line that looks like a name (2-4 words, no special chars)
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[^a-zA-Z\s.]/g, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every(w => w.length > 1)) {
      return cleaned;
    }
  }
  return null;
}

function extractTitle(lines) {
  const titleKeywords = ['engineer', 'developer', 'architect', 'manager', 'designer',
    'analyst', 'consultant', 'lead', 'senior', 'junior', 'intern', 'devops',
    'full-stack', 'frontend', 'backend', 'qa', 'tester'];

  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();
    if (titleKeywords.some(k => lower.includes(k)) && line.length < 80) {
      return line;
    }
  }
  return null;
}

function extractLocation(text) {
  // Simple city/state pattern
  const match = text.match(/(?:location|address|city|based in)[:\s]*([A-Z][a-zA-Z\s,]+)/i);
  return match ? match[1].trim().substring(0, 100) : null;
}

function extractExperience(text) {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSkills(text) {
  const knownSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Ruby', 'PHP',
    'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'GraphQL', 'REST', 'gRPC', 'Kafka', 'RabbitMQ',
    'Git', 'CI/CD', 'Jenkins', 'Linux', 'Nginx',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
    'Agile', 'Scrum', 'DevOps', 'Microservices',
    'HTML', 'CSS', 'SASS', 'Tailwind', 'Bootstrap',
    'SQL', 'NoSQL', 'Firebase', 'Supabase'
  ];

  const textLower = text.toLowerCase();
  return knownSkills.filter(skill => textLower.includes(skill.toLowerCase()));
}

module.exports = { parseResume, extractCandidateInfo };
