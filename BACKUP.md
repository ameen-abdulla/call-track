# Call Track — Database Backup, Migrations & Restore Guide

This document explains how data persistence, automated backups, migrations, and disaster recovery work in the **Call Track** application.

---

## 1. What Is Backed Up vs What Is in Git

- **Application Code & Schemas (in Git)**:
  - All TypeScript/React source code, configuration files, and Prisma schema definitions (`prisma/schema.prisma`) are tracked in the Git repository (`ameen-abdulla/call-track`).
- **Database Store (NOT in Git)**:
  - The SQLite database file (`dev.db`, `dev.db-wal`, `dev.db-shm`) contains all live production/prospect records, freelancer accounts, calls, interactions, and audit logs.
  - SQLite database files and the `backups/` directory are strictly **`.gitignore`d** to prevent committing sensitive prospect data or binary database locks to version control.

---

## 2. Automated Daily WAL-Safe Backups

Call Track includes an automated background cron job (configured in `src/lib/cron.ts`) that produces safe, atomic point-in-time snapshots of the database.

- **Technology**: Uses SQLite's `VACUUM INTO '<backup-path>'` command.
- **Zero-Corruption Guarantee**: Unlike raw file copying (which can corrupt active databases running with Write-Ahead Logging `WAL` mode enabled), `VACUUM INTO` creates a clean, fully consistent, self-contained SQLite copy without interrupting live user traffic.
- **Storage Location**: Saved to the `backups/` folder as `calltrack-backup-YYYY-MM-DD-HHmm.db`.
- **Default Schedule**: Runs daily at **2:00 AM** (`0 2 * * *`).

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `BACKUP_CRON_SCHEDULE` | `0 2 * * *` | Standard 5-field cron expression for backup timing |
| `BACKUP_DIR` | `<project_root>/backups` | Directory path where timestamped `.db` files are stored |
| `CALL_VERIFICATION_WINDOW_MINUTES` | `30` | Minutes window to match tap-to-call click attempts with logs |

---

## 3. What Happens on `git pull`

Pulling the latest code from GitHub:

```bash
git pull origin main
```

- **Database Safety**: `git pull` **NEVER** touches or overwrites your existing SQLite database file (`dev.db`). Your prospects, assignments, caller history, and credentials remain 100% intact.
- **Applying Schema Updates**:
  When a code pull introduces changes to `prisma/schema.prisma` or new tables (e.g. `CallAttempt`, `Interaction`, `ActivityLog`):
  
  ```bash
  # Step 1: Apply database schema updates
  npx prisma db push
  
  # Step 2: Regenerate Prisma Client types
  npx prisma generate
  
  # Step 3: (If dockerized) Rebuild and restart
  docker compose up --build -d
  ```

---

## 4. Disaster Recovery & Restore Procedure

If the live database file ever becomes corrupted or data needs to be rolled back to a previous point in time:

1. **Stop the Application**:
   ```bash
   # If running via Docker Compose:
   docker compose down
   
   # Or terminate the node process
   ```

2. **Locate the desired backup file**:
   Browse the `backups/` folder and choose the timestamped backup:
   ```
   backups/
     ├── calltrack-backup-2026-08-22-02-00.db
     └── calltrack-backup-2026-08-21-02-00.db
   ```

3. **Replace the database file**:
   Copy the backup file to replace `dev.db` (and remove any stale `.db-wal` / `.db-shm` lock files):
   ```bash
   # Windows PowerShell:
   Remove-Item prisma/dev.db-wal, prisma/dev.db-shm -ErrorAction SilentlyContinue
   Copy-Item backups/calltrack-backup-2026-08-22-02-00.db prisma/dev.db -Force
   
   # Linux / macOS:
   rm -f prisma/dev.db-wal prisma/dev.db-shm
   cp backups/calltrack-backup-2026-08-22-02-00.db prisma/dev.db
   ```

4. **Verify Schema & Restart**:
   ```bash
   npx prisma generate
   docker compose up --build -d
   ```

---

## 5. Manual On-Demand Backup

To create an instant backup before major administrative actions:

```bash
# In SQLite CLI or via Node tsx script:
sqlite3 prisma/dev.db "VACUUM INTO 'backups/manual-backup-$(date +%Y%m%d%H%M).db';"
```
