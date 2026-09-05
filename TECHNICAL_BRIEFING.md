# Technical Briefing & Architecture Audit: Call Tracker

---

### 1. System Architecture

* **High-Level Purpose**: Internal tele-calling command center and outbound lead tracking CRM. Orchestrates lead distribution, real-time outreach SLA enforcement, interaction tracking, and conversion analytics for distributed freelancer callers.
* **Core Tech Stack**:
  * **Framework**: Next.js 16.3.1 (App Router, Turbopack, React 19 Server Components / Client Components).
  * **Language & Runtime**: TypeScript 5.x on Node.js 20-alpine runtime.
  * **Data Layer / ORM**: Prisma ORM 6.19.3 accessing SQLite (`/data/dev.db` via named Docker volume).
  * **Authentication**: Auth.js / NextAuth.js v5 (JWT session strategy, role-based claims: `ADMIN` vs `FREELANCER`, credentials provider with `bcryptjs` hashing).
  * **Telemetry & Cron**: `node-cron` running background SQLite vacuum/backup snapshots and automated activity overdue status transitions.
  * **Styling & UI**: Tailwind CSS v4, Lucide React icons, CSS variable-driven light/dark themes.
* **Environment & Runtime Constraints**:
  * **Single-Process SQLite Storage**: Database file is persistent across container restarts via `/data/dev.db` bind mount. Requires careful write transaction scopes (`prisma.$transaction`) to prevent write-lock contention (`SQLITE_BUSY`).
  * **Strict Role Routing**: Auth guard enforced at edge/middleware level (`src/middleware.ts`) and API utility level (`requireAuth()` in `src/lib/api-utils.ts`). Non-approved callers (`PENDING`, `REJECTED`, `SUSPENDED`) are quarantined to `/login?error=account_status`.

---

### 2. Directory & Module Map

```
call-track/
├── docker-compose.yml              # Single container deployment with /data volume mount
├── Dockerfile                      # Multi-stage production build (Node 20-alpine)
├── prisma/
│   └── schema.prisma               # 11 models: User, Contact, Interaction, Activity, CallAttempt, etc.
└── src/
    ├── middleware.ts               # Global NextAuth route boundary & role redirection
    ├── lib/
    │   ├── api-utils.ts            # requireAuth(role?), session unwrapping, error responses
    │   ├── auth.ts                 # NextAuth configuration, credentials provider, token callbacks
    │   ├── cron.ts                 # SQLite scheduled backup & overdue activity state transitions
    │   ├── db.ts                   # Global PrismaClient singleton
    │   └── urgency.ts              # Batch SLA calculator (<24h, 24-72h, >72h, attempted)
    ├── components/
    │   ├── notification-bell.tsx   # Real-time caller notification popover
    │   ├── urgency-badge.tsx       # Visual SLA status indicator (red/orange/green/attempted)
    │   └── analytics/              # Modular Command Center visualizers
    │       ├── kpi-strip.tsx       # Top KPI strip with interactive navigation triggers
    │       ├── followup-pipeline-card.tsx # Horizon bucket distribution card
    │       ├── urgency-panel.tsx   # SLA breakdown with contact filtering callbacks
    │       ├── call-outcomes-table.tsx    # Paginated caller interaction audit log
    │       ├── sales-funnel-chart.tsx     # Horizon-scoped conversion funnel
    │       └── tag-coverage-chart.tsx     # Lead category tag allocation visualizer
    └── app/
        ├── login/ & register/      # Public credentials portal & freelancer onboarding
        ├── admin/
        │   ├── page.tsx            # Command Center: Tabbed views (Overview, Team, Funnel, Contacts, Overdue, Roster)
        │   ├── activity-logs/      # Immutable audit trail for administrative mutations
        │   ├── contacts/
        │   │   ├── unassigned/     # High-throughput batch assignment workspace
        │   │   └── deleted/        # Soft-delete recovery pool
        │   └── freelancers/        # Caller directory, applicant approval queue, password reset
        ├── freelancer/
        │   ├── page.tsx            # Caller Workspace: Tabs (Queue, Today's, Follow-ups, Activity Log)
        │   └── call/[id]/page.tsx  # Active calling dialer interface & interaction logger
        └── api/
            ├── admin/              # Admin-only endpoints (analytics, dashboard, freelancers, audit)
            ├── agent/dashboard/    # Freelancer dashboard payload with computed SLA badges
            ├── call-attempts/      # Telemetry logger capturing 'tel:' protocol dialer taps
            ├── contacts/           # Lead CRUD, CSV bulk import, SLA/priority/tag query filters
            ├── interactions/       # Unified customer touchpoint log (CALL, EMAIL, MEETING)
            └── activities/         # Scheduled callback/meeting pipeline with horizon buckets
```

---

### 3. Core Data Flow & State Management

```
┌──────────────┐     CSV Upload      ┌──────────────────┐    Auto/Manual    ┌─────────────────┐
│ Admin Client │ ──────────────────> │ /contacts/import │ ────────────────> │ Contact Pool    │
└──────────────┘                     └──────────────────┘                   │ (new / queued)  │
                                                                            └────────┬────────┘
                                                                                     │ Assigned
                                                                                     ▼
┌───────────────────┐    tel: tap    ┌─────────────────┐    Log Form        ┌─────────────────┐
│ Call Attempts API │ <───────────── │ Freelancer Dial │ <───────────────── │ Freelancer      │
│ (/call-attempts)  │                │ Screen (/call)  │                    │ Queue (Urgent)  │
└─────────┬─────────┘                └────────┬────────┘                    └─────────────────┘
          │ Linked via UUID                   │ Submits interaction
          ▼                                   ▼
┌───────────────────────────────────────────────────────┐
│ POST /api/interactions                                │
│ ├── Records Interaction (connected, response, notes)  │
│ ├── Updates Contact status (converted/follow_up/lost) │
│ └── Creates Activity row (if nextActivityDate set)    │
└───────────────────────────────────────────────────────┘
```

* **Lead Ingestion & Persistence**:
  ```ts
  // Contact Schema Signature
  interface Contact {
    id: string; name: string; phone: string; phone2?: string; email?: string;
    company?: string; source?: string; callPriority?: 'A' | 'B' | null;
    status: 'new' | 'queued' | 'contacted' | 'follow_up' | 'converted' | 'lost';
    assignedToId?: string; deletedAt?: Date | null;
  }
  ```
  CSV importer validates column schemas (standard and Qatar formats), extracts clean emails, and commits contacts in batch transactions.
* **SLA Calculation Pipeline (`src/lib/urgency.ts`)**:
  * Executes non-blocking batch calculations in max **2 SQL queries** (prevents $N+1$ latency).
  * Measures elapsed time between current `AssignmentHistory.createdAt` and now:
    * 🔴 **Critical (`red`)**: Unattempted and $\ge 72\text{h}$ (or $>48\text{h}$ depending on threshold configuration).
    * 🟠 **Pending (`orange`)**: Unattempted and $24\text{h} \le t < 72\text{h}$.
    * 🟢 **Fresh (`green`)**: Unattempted and $< 24\text{h}$.
    * ⚪ **Attempted (`attempted`)**: `CallAttempt` timestamp recorded after assignment.
* **Caller Telemetry & Anti-Tampering**:
  * Clicking "Call Primary" triggers a background POST to `/api/call-attempts` capturing IP hash, User-Agent, and monotonic timestamp.
  * When logging the result via `/api/interactions`, backend transactions auto-link the most recent unconsumed `CallAttemptId` to prove an outbound dial was initiated.
* **State Management Paradigm**:
  * URL query params for deep-linkable filters (`search`, `assignment`, `status`, `callPriority`, `tagId`, `urgency`, `dateRange`).
  * Optimistic client state transitions on freelancer actions ("Mark Done" and "View/Edit Interaction Modal") backed by 60-second polling synchronization.

---

### 4. Active Implementation & Recent Refactoring Focus

* **Tile-to-View Callback Decoupling**: Refactored `KPIStrip` and `FollowupPipelineCard` in `src/app/admin/page.tsx` from indiscriminate view navigation to contextual routing:
  * Overdue follow-up tile routes to dedicated `mainView = 'overdue'`.
  * Calls logged tile routes to `analyticsSubTab = 'outcomes'`.
  * Demos booked tile routes to `analyticsSubTab = 'pipeline'`.
* **State Reset Architecture on Cross-View Navigation**: Implemented explicit state wiping in `onSelectFilter` handlers to eliminate stale filter collisions (e.g., preventing unassigned pool filters from zeroing out converted lead queries).
* **Follow-up Horizon Pipeline Engine**: Built an interactive timeframe selector tab strip (`overdue`, `dueToday`, `next7Days`, `days8to30`, `days31Plus`) in `src/app/admin/page.tsx` backed by query parameters on `/api/activities?bucket=...`.
* **Dynamic SLA Overdue Resolution**: Updated `/api/admin/dashboard` to compute overdue follow-ups dynamically (`dueDate < now()`) rather than strictly relying on `status == 'overdue'`, eliminating the 1-hour cron latency window.
* **Priority A/B SQLite Sorting Normalization**: Enforced explicit null handling across queue queries (`a.callPriority || 'Z'`) so unprioritized leads do not precede Priority A leads under SQLite ASC default ordering.

---

### 5. Known Constraints & Blockers

* **SQLite Concurrency & WAL Mode**:
  * The application runs on SQLite. High concurrent write bursts (e.g., simultaneous bulk assignments and active caller log submissions) require short transaction windows. SQLite WAL mode (`PRAGMA journal_mode=WAL;`) is mandatory in production.
* **Next.js 16 Proxy / Middleware Deprecation Notice**:
  * Next.js 16 emits: `The "middleware" file convention is deprecated. Please use "proxy" instead.` Future framework upgrades require migrating `src/middleware.ts` to route handlers or Next.js proxy conventions.
* **Prisma Configuration Migration Notice**:
  * Prisma 6 emits a deprecation warning regarding `package.json#prisma`. Requires migration to `prisma.config.ts` prior to Prisma 7.
* **Dual Logging Legacy Model**:
  * The codebase maintains both `Call` (legacy) and `Interaction` (unified) database models. While write operations in `/api/interactions` mirror records to `Call`, modifications made via `PUT /api/interactions/[id]` do not sync backwards to `Call`. All new reporting must read strictly from `prisma.interaction`.
* **Container Clock Synchronization**:
  * SLA urgency calculations and scheduled follow-up due dates rely on container system time. When deploying in environments across disparate time zones (e.g., UTC server vs GMT+3/+4 local callers), datetime inputs in client modals (`<input type="datetime-local">`) require explicit timezone conversion handling.
