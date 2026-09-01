# Call Track — Marketing Call & Feedback App

> **Version: Patch 1.1**  
> A high-performance, mobile-first web app for marketing call teams, outbound outreach, SLA tracking, and lead conversion management.

---

## 🚀 What's New in Patch 1.1

- **Contact Urgency Meter & SLA Tracking**:
  - Real-time SLA tracking categorized into **Fresh (<24h)**, **Pending (24–72h)**, **Critical (>72h)**, and **Attempted** outreach.
  - Freelancers can toggle **"Urgent First"** / **"Priority Sort"** to tackle overdue leads before SLA breaches.
  - Admin analytics include interactive drill-down urgency panels with caller breakdown.
- **Admin Call Outcomes & Executive Analytics**:
  - Dedicated call report tab in Analytics with filtering by date range, Freelancer/caller, and Category Tags.
  - Detailed logs of all calls with connected status, outcome badges, feedback notes, and timestamps.
  - Reachability donut chart, follow-up pipeline visualization, and actionable Data Quality checklist.
- **Freelancer Activity Log (4th Tab)**:
  - New tab on the Freelancer dashboard enabling callers to review their complete call and interaction history.
  - In-place **Edit** capability to correct outcomes, update response notes, adjust interest levels, or reschedule follow-up activities.
  - Instant **Call Again** action to quickly re-dial contacts.
- **Category Tags Management (`/admin/tags`)**:
  - Manage custom lead categorization tags (e.g. Education, Fleet, Construction) with real-time sector coverage charts.
- **Audit Activity Logs (`/admin/activity-logs`)**:
  - Comprehensive system-wide chronological audit trail tracking all logged interactions, calls, and activity updates.
- **Deleted Contacts Pool (`/admin/contacts/deleted`)**:
  - Soft-delete safety net with one-click restore capabilities.
- **Add Admin UI**:
  - Direct UI modal in the Admin portal to create additional Admin accounts seamlessly.
- **Security, Rate Limiting & Input Sanitization**:
  - In-memory sliding window rate limiting on authentication and registration endpoints to protect against brute-force attacks.
  - Strict password validation policy: minimum 8 characters, at least 1 uppercase letter, 1 number, 1 special character (`!@#$%&`), and common password blocklist.
  - Input sanitization stripping harmful control characters and normalizing emails.
- **Automated WAL-Safe SQLite Backups**:
  - Zero-corruption point-in-time SQLite backups using background cron execution (`VACUUM INTO`) to the `backups/` directory.
- **Dynamic Seed Passwords**:
  - Cryptographically secure, randomly generated seed passwords generated during `npm run db:seed`.
  - Seed credentials are automatically saved to `SEED_CREDENTIALS.txt` (never hardcoded defaults).

---

## ⚡ Quick Start

### Prerequisites
- **Node.js 20+**
- **npm** (or Docker Desktop for containerized deployment)

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env if needed (default SQLite works out of the box)

# 3. Initialize database & seed initial data
npm run db:push
npm run db:seed

# 4. Start development server
npm run dev
```

The application will be accessible at: `http://localhost:3000` (or `https://calltrack.flexibook.ai` if configured with Cloudflare Tunnel).

### Production Build

```bash
npm run build
npm run start
```

---

## 🔐 Initial Login & Seed Credentials

During `npm run db:seed`, secure passwords are dynamically generated and saved to **`SEED_CREDENTIALS.txt`** in the project root:

```
============================================
 GENERATED SEED CREDENTIALS (save these!)
 Admin:      admin@calltrack.local       →  <Generated_Password>
 Freelancer: freelancer@calltrack.local  →  <Generated_Password>
============================================
```

> ⚠️ **Important**: Open `SEED_CREDENTIALS.txt` to retrieve your initial admin and freelancer credentials. Ensure passwords are changed or managed safely before production use.

### Password Requirements
When registering or creating new accounts (Admins or Freelancers), passwords must meet the following policy:
- Minimum **8 characters**
- At least **one uppercase letter** (A–Z)
- At least **one number** (0–9)
- At least **one special character** (`! @ # $ % &` etc.)
- Must not match common weak passwords

---

## 🐳 Installation via Docker Desktop (Recommended for Production)

Run Call Track seamlessly on Windows or macOS with persistent storage:

### Step 1 — Install Docker Desktop (One-time)
Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop), install, and ensure Docker engine is running.

### Step 2 — Run Setup (One-time)
Right-click **`setup.ps1`** → **Run with PowerShell**.

This script builds the container and creates two desktop shortcuts:
- **Start Call Track** — launches the container and opens `http://localhost:3000`
- **Stop Call Track** — safely shuts down the container

### Data Persistence
All database records (contacts, call logs, activities, users) are stored in a dedicated Docker volume (`call-track-data`). Data persists across restarts, updates, and rebuilds.

---

## 🌐 Cloudflare Tunnel Setup

To securely expose Call Track to your remote team with SSL encryption and zero port forwarding:
1. Install `cloudflared` on the host machine.
2. Authenticate and create a named tunnel pointing to `http://localhost:3000`.
3. Configure your custom hostname (e.g. `calltrack.flexibook.ai`).
4. Run tunnel as a background service.
