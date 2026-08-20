# Architectural Decisions

## Database: SQLite (default)
- **Version skipped**: PostgreSQL
- **Reason**: Zero-config for local deployment on client's laptop. No separate DB server needed.
- **Migration path**: Change `DATABASE_URL` to a Postgres connection string and update `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`, then run `prisma migrate deploy`.

## Auth: NextAuth.js v5 (Auth.js)
- JWT strategy with httpOnly cookies
- Role validation happens server-side on every request — the frontend toggle is UX only
- Passwords hashed with bcrypt (cost 10)

## Scheduled Jobs: node-cron (in-process)
- Runs inside the Next.js server process
- **Limitation**: jobs only run while the server is up. For always-on scheduling, extract to a separate worker or use a Windows Task Scheduler script.

## Cron Initialization
- Cron is started via a server-side module import in the Next.js server startup. The `src/lib/cron.ts` is imported in a startup route that is called once.
