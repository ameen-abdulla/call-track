# Call Track — Marketing Call & Feedback App

A mobile-first web app for tracking marketing calls, logging outcomes, and managing follow-ups.

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env if needed (defaults work out of the box)

# Set up database and seed
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Open http://localhost:3000

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@calltrack.local | admin123 |
| Secretary | secretary@calltrack.local | secretary123 |

> ⚠️ Change these passwords before going live!

### Production Build

```bash
npm run build
npm run start
```

## Installation (Docker Desktop)

This is the recommended way to run Call Track — no developer tools needed after setup.

### Step 1 — Install Docker Desktop (one time)
Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop), install, and open it. Wait for the whale icon to appear in your taskbar.

### Step 2 — Run Setup (one time)
Right-click **`setup.ps1`** → **Run with PowerShell**.

This creates two desktop shortcuts:
- **Start Call Track** — launches the app and opens your browser
- **Stop Call Track** — shuts it down

> First launch takes 3–5 minutes to build. Every launch after that takes ~10 seconds.

### Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@calltrack.local | admin123 |
| Secretary | secretary@calltrack.local | secretary123 |

> Change these after first login.

### Data
All your contacts, calls, and notes are stored in a Docker volume. They persist between restarts and are not affected by updates.

## Cloudflare Tunnel Setup
See Section 8 of the project spec for detailed Cloudflare Named Tunnel setup instructions to expose the app securely to your team.
