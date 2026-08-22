# Call Track — QA Pass Findings & Verification Report

**Reviewer**: Senior QA & Security Reviewer  
**Status**: Comprehensive Verification Complete  
**Date**: August 22, 2026  
**Repository**: `ameen-abdulla/call-track`  

---

## Executive Summary

A comprehensive, adversarial QA review of the Call-Track Dashboard Overhaul was conducted across the Prisma schema, Click-to-Call verification engine, Admin controls, Recharts analytics calculations, next-themes dark/light palettes, authentication/session invalidation, activity logs, and automated SQLite WAL-safe backups.

All 10 areas of the overhaul were validated. Five (5) hidden edge cases and bug fixes were identified, resolved, and verified.

---

## 1. Schema & Migration Integrity

- ✅ **Verified working**: `CallAttempt`, `Interaction`, and `ActivityLog` models exist with all specified composite and single-column indexes:
  - `CallAttempt`: `@@index([contactId])`, `@@index([freelancerId])`, `@@index([triggeredAt])`
  - `Interaction`: `@@index([contactId])`, `@@index([freelancerId])`, `@@index([type])`, `@@index([occurredAt])`
  - `ActivityLog`: `@@index([actorId])`, `@@index([action])`, `@@index([createdAt])`
- ✅ **Verified working**: `Contact.deletedAt` is implemented as a nullable `DateTime?` (`@@index([deletedAt])`), NOT a surrogate boolean.
- ✅ **Verified working**: Backfill script [`prisma/backfill-interactions.ts`](file:///d:/FamCode/Call%20Tracker/call-track/prisma/backfill-interactions.ts) exists and safely maps legacy `Call` rows to `Interaction` with `type = CALL`.
- ✅ **Verified working**: No orphaned foreign keys exist in the database.

---

## 2. Click-to-Call Verification (Adversarial Testing)

- ✅ **Verified working**: The mobile `tel:` link calls `navigator.sendBeacon` (with fallback to `fetch` with `keepalive: true`) so that navigation to the phone dialer never aborts the call attempt registration.
- ✅ **Verified working**: Server-side freelancer ID is strictly derived from `session.user.id` on the server in [`src/app/api/call-attempts/route.ts`](file:///d:/FamCode/Call%20Tracker/call-track/src/app/api/call-attempts/route.ts). Client tampering attempts to spoof caller IDs are completely ignored.
- ✅ **Verified working**: Verification window (`CALL_VERIFICATION_WINDOW_MINUTES`, default 30 min) is read from environment variables and checked against `triggeredAt: { gte: windowStart }`.
- ✅ **Verified working**: Logging without a prior `CallAttempt` is never blocked; it cleanly flags the record as `Unverified`.
- ✅ **Verified working**: "Verified" (tap detected) and "Connected" (prospect answered) are genuinely independent fields and never conflated.
- 🔍 **Hidden Issue Found & Fixed (Spam Protection / Button Mashing)**:
  - *What was wrong*: Rapid repeated clicks on the call button created redundant `CallAttempt` rows in the database.
  - *Why it matters*: Could inflate database storage and distort attempt metrics if a user double-taps on mobile.
  - *Fix Applied*: Added a **60-second cooldown deduplication window** in `POST /api/call-attempts`. If a tap was logged for the same contact & freelancer within the last 60 seconds, the existing attempt is returned without creating duplicate database rows.
- ⚠️ **Working but has issues & Fixed (Auto-link Server-Side Safeguard)**:
  - *What was wrong*: If a caller tapped call and logged an interaction within the same page session without a full page reload, the client beacon ID might not have synced back to the frontend form in time.
  - *Fix Applied*: Added server-side fallback auto-linking in `POST /api/interactions`: if `type === 'CALL'` and no `callAttemptId` was provided, the server automatically queries and links the most recent valid `CallAttempt` within the verification window.

---

## 3. Admin Contact Edit & Soft-Delete

- ✅ **Verified working**: Contact edits write an `ActivityLog` record containing a structured JSON diff of `before` and `after` values for every modified field.
- ✅ **Verified working**: Contact delete is strictly soft (`deletedAt: new Date()`). The row remains preserved in SQLite.
- ✅ **Verified working**: Deleting a contact automatically unassigns the caller, records `AssignmentHistory` with reason `'contact_deleted'`, and writes an `ActivityLog` entry.
- ✅ **Verified working**: Soft-deleted contacts are excluded across all queries:
  - Main Contact list (`/api/contacts`)
  - Unassigned pool (`/api/admin/contacts/unassigned`)
  - Bulk assignment (`/api/admin/contacts/bulk-assign`)
  - Admin & Freelancer dashboards (`/api/admin/dashboard`, `/api/agent/dashboard`)
  - Analytics calculations (`/api/admin/analytics`)
- ✅ **Verified working**: Freelancers hitting `DELETE /api/contacts/[id]` or `PUT /api/contacts/[id]` receive `403 Forbidden`.
- ✅ **Verified working**: Soft-deleted contacts can be viewed and restored with 1 click at [`/admin/contacts/deleted`](file:///d:/FamCode/Call%20Tracker/call-track/src/app/admin/contacts/deleted/page.tsx).

---

## 4. Dashboard Analytics & Calculations

- ✅ **Verified working**:
  - Top KPI Strip math verified: Total Prospects = Assigned + Unassigned.
  - Connected vs Not Connected chart strictly filters `Interaction` rows where `type = CALL`.
  - Date range filters (`All Time`, `Today`, `7D`, `30D`, `Custom`) properly filter the underlying `occurredAt` timestamps.
  - Follow-up pipeline urgency buckets correctly segment boundaries: Overdue (< today), Due Today (00:00 to 23:59), 7 Days, 8–30 Days, 31+ Days, No Follow-up.
  - Freelancer workload table accurately computes individual connect rates %, follow-ups owed, and unverified call logs.
  - Chart label collisions resolved (Legend placed in top-right with expanded X-axis height).

---

## 5. Dark / Light Mode

- ✅ **Verified working**: `next-themes` persists theme selection in `localStorage` across page reloads and login sessions.
- ✅ **Verified working**: High contrast color tokens and adaptive Recharts palettes render clearly against both light (`#ffffff`, `#f8fafc`) and dark (`#030712`, `#111827`) backgrounds.
- ✅ **Verified working**: All modals, audit tables, and contact pool views support dark mode tokens.

---

## 6. Sign-Out & Session Revocation

- ❌ **Broken & Fixed (Public Route in Middleware)**:
  - *What was wrong*: `/auth/signed-out` was initially omitted from the public route list in `src/middleware.ts`, causing logged-out users reaching `/auth/signed-out` to be bounced immediately back to `/login`.
  - *Why it matters*: Broke the intended post-signout confirmation UX.
  - *Fix Applied*: Added `pathname === '/auth/signed-out'` to the public matcher in [`src/middleware.ts`](file:///d:/FamCode/Call%20Tracker/call-track/src/middleware.ts).
- ✅ **Verified working**: Calling `signOut({ callbackUrl: '/auth/signed-out' })` destroys the session client-side and server-side.
- 🔍 **Hidden Issue Found & Fixed (Suspension API Enforcement)**:
  - *What was wrong*: Suspended freelancers were redirected on page navigations, but if they had an active JWT and made raw API calls directly, `requireAuth` was only checking role.
  - *Fix Applied*: Updated `requireAuth` in [`src/lib/api-utils.ts`](file:///d:/FamCode/Call%20Tracker/call-track/src/lib/api-utils.ts) to explicitly reject unapproved/suspended accounts (`freelancerStatus !== 'APPROVED'`) with `403 Forbidden`.

---

## 7. Call Logs vs Activity Logs

- ✅ **Verified working**: Admin `ActivityLog` viewer at [`/admin/activity-logs`](file:///d:/FamCode/Call%20Tracker/call-track/src/app/admin/activity-logs/page.tsx) and API at [`/api/admin/activity-logs`](file:///d:/FamCode/Call%20Tracker/call-track/src/app/api/admin/activity-logs/route.ts) are strictly locked to `ADMIN` users.
- ✅ **Verified working**: ActivityLog table has **no DELETE or PUT routes** anywhere in the codebase. It is 100% append-only.
- ✅ **Verified working**: Freelancers can only query their own interaction records.

---

## 8. Backup & Migrations

- ✅ **Verified working**: Automated backup cron runs daily via SQLite `VACUUM INTO 'backups/calltrack-backup-YYYY-MM-DD-HHmm.db'`.
- ✅ **Verified working**: Tested backup execution directly on SQLite; created a 180,224-byte uncorrupted snapshot file.
- ✅ **Verified working**: `BACKUP.md` created with instructions for migrations, WAL safety, and disaster recovery.

---

## 9. Regression Check

- ✅ **Verified working**: Freelancer self-registration (`/register`) and admin approval workflow (`/admin/freelancers`) function seamlessly.
- ✅ **Verified working**: Tag categorization and `callPriority` (A/B) remain distinct and un-conflated.
- ✅ **Verified working**: Bulk assignment and reassign-all actions maintain atomic transactions and audit logging.

---

## 10. Summary of Fixes Applied During QA Pass

| Issue ID | File Fixed | Description |
| :--- | :--- | :--- |
| **QA-FIX-01** | `src/middleware.ts` | Added `/auth/signed-out` to public whitelist to prevent redirect loop to `/login` |
| **QA-FIX-02** | `src/lib/api-utils.ts` | Enforced `freelancerStatus === 'APPROVED'` check on all API routes to reject suspended callers |
| **QA-FIX-03** | `src/app/api/call-attempts/route.ts` | Added 60-second cooldown deduplication to prevent call-button spam/database bloating |
| **QA-FIX-04** | `src/app/api/interactions/route.ts` | Added server-side auto-linking of recent valid `CallAttempt` within verification window |
| **QA-FIX-05** | `src/app/api/admin/contacts/[id]/assign/route.ts` | Enforced soft-delete validation when assigning contacts |

---

## Not Fixed / Needs a Decision

1. **Call Attempt Cooldown Duration**:
   - *Current Implementation*: 60-second cooldown deduplication per contact/freelancer.
   - *Question for Product*: If a caller accidentally clicks call, hangs up in 5 seconds, and redials immediately, should the 60-second window be shortened to 30 seconds, or is 60 seconds optimal? (Currently, verification remains active either way).
2. **Activity Log Retention / Pruning**:
   - *Current Implementation*: Append-only logs are retained indefinitely.
   - *Question for Product*: Should automated pruning (e.g. archiving logs older than 180 days) be added to the daily backup cron in the future?
