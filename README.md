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

## Running with Docker Desktop (Recommended for sharing)

This is the easiest way to run Call Track on any Windows, Mac, or Linux machine.

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop) (free)
- Make sure Docker Desktop is running (whale icon in taskbar)

### Start
Double-click **`Start with Docker.bat`**

- First run takes 3–5 minutes to build the image
- Every run after that starts in seconds
- Browser opens automatically at http://localhost:3000

### Stop
Double-click **`Stop Docker.bat`**

### Notes
- Your data (contacts, calls, activities) is stored in a Docker volume and **persists between restarts**
- Default credentials are the same: `admin@calltrack.local` / `admin123`

## Cloudflare Tunnel Setup
See Section 8 of the project spec for detailed Cloudflare Named Tunnel setup instructions to expose the app securely to your team.
