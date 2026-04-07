# Resume Vendor Management System

A full-stack application for managing resumes from multiple staffing vendors through a structured screening pipeline.

## Architecture

```
Email Ingestion → Resume Parser → Database → Screening Pipeline → Notifications
                                     ↓
                              React Dashboard (Kanban)
                              Vendor Portal (read-only)
                              Reports & Analytics
```

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** React
- **Auth:** JWT
- **Email:** IMAP listener + Nodemailer
- **Parsing:** pdf-parse + mammoth (DOCX)

## Quick Start

### Option 1: Docker (recommended)

```bash
docker-compose up --build
```

This starts PostgreSQL, the API server (port 4000), and the React client (port 3000).

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+

1. **Create the database:**
   ```sql
   CREATE DATABASE resume_vendor;
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

4. **Run migrations and seed data:**
   ```bash
   cd server
   npm run migrate
   npm run seed
   ```

5. **Start development servers:**
   ```bash
   # From root directory
   npm run dev
   ```

   Or separately:
   ```bash
   cd server && npm run dev    # API on port 4000
   cd client && npm start      # React on port 3000
   ```

## Demo Credentials

| Role      | Email                        | Password     |
|-----------|------------------------------|--------------|
| Admin     | admin@yourcompany.com        | admin123     |
| Recruiter | recruiter@yourcompany.com    | recruiter123 |
| Vendor    | portal@techsupply.com        | vendor123    |

## Features

### Email Ingestion
- IMAP listener polls a dedicated mailbox for new resumes
- Auto-identifies vendor from sender's email domain
- Extracts PDF/DOCX attachments and parses them
- Manual upload also supported via the dashboard

### Resume Parsing
- Extracts: name, email, phone, skills, experience, title
- Supports PDF and DOCX formats
- Matches against a known skills dictionary

### Duplicate Detection
- Flags candidates submitted by multiple vendors (same email)
- Links duplicates to the original submission

### Screening Pipeline
- 4-stage pipeline: Screening → L1 Review → L2 Review → Final Decision
- Validated transitions (can't skip stages)
- Interview feedback with ratings and recommendations

### Notifications
- Auto-emails vendors when candidate status changes
- All notifications logged even if SMTP isn't configured

### Recruiter Dashboard (Kanban)
- Column-per-stage view matching your mockup
- Vendor-color-coded cards with initials
- Filter by vendor
- One-click advance/reject from cards

### Vendor Portal
- Read-only access for vendors
- See only their own candidates
- Status summary + candidate list

### Reports
- Pipeline funnel visualization
- Per-vendor analytics (submission count, selection rate, duplicates)
- Submission timeline

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `POST /api/auth/register` — Create user (admin only)

### Vendors
- `GET /api/vendors` — List vendors
- `POST /api/vendors` — Create vendor
- `PUT /api/vendors/:id` — Update vendor

### Candidates
- `GET /api/candidates` — List with filters
- `GET /api/candidates/:id` — Detail with history
- `POST /api/candidates/upload` — Upload resume
- `PUT /api/candidates/:id` — Update fields
- `POST /api/candidates/:id/feedback` — Add interview feedback

### Pipeline
- `PUT /api/pipeline/:id/status` — Move through pipeline
- `GET /api/pipeline/history/:id` — Stage history

### Dashboard
- `GET /api/dashboard/kanban` — Kanban data
- `GET /api/dashboard/stats` — Overall stats

### Reports
- `GET /api/reports/vendor-analytics` — Per-vendor stats
- `GET /api/reports/pipeline-funnel` — Funnel data
- `GET /api/reports/timeline` — Submissions over time

## Project Structure

```
├── server/
│   ├── src/
│   │   ├── index.js              # Express app entry
│   │   ├── db/
│   │   │   ├── pool.js           # PostgreSQL connection
│   │   │   ├── migrate.js        # Schema migrations
│   │   │   └── seed.js           # Demo data
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT auth + role checks
│   │   │   └── upload.js         # Multer file upload
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── vendors.js
│   │   │   ├── candidates.js
│   │   │   ├── pipeline.js
│   │   │   ├── dashboard.js
│   │   │   ├── reports.js
│   │   │   └── emailIngestion.js
│   │   ├── services/
│   │   │   ├── emailIngestion.js  # IMAP + manual ingest
│   │   │   ├── resumeParser.js    # PDF/DOCX extraction
│   │   │   └── notificationService.js
│   │   └── utils/
│   │       └── logger.js
│   └── Dockerfile
├── client/
│   ├── src/
│   │   ├── App.js
│   │   ├── api.js                # Axios API client
│   │   ├── context/AuthContext.js
│   │   ├── components/Layout.js
│   │   └── pages/
│   │       ├── Login.js
│   │       ├── Dashboard.js      # Kanban board
│   │       ├── Candidates.js     # List + upload
│   │       ├── CandidateDetail.js
│   │       ├── Vendors.js
│   │       ├── Reports.js
│   │       └── VendorPortal.js   # Read-only vendor view
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Email Configuration

To enable email ingestion, configure one of:

**IMAP (any provider):**
```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=resumes@yourcompany.com
IMAP_PASSWORD=app-specific-password
```

**SMTP (for notifications):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=app-specific-password
```

For Gmail, use an App Password (not your account password).
