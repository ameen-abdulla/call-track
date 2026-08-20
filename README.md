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

## Cloudflare Tunnel Setup
See Section 8 of the project spec for detailed Cloudflare Named Tunnel setup instructions to expose the app securely to your team.
