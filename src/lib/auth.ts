import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit, resetLimit } from '@/lib/rate-limit'
import { normalizeEmail } from '@/lib/password-policy'

const FIVE_MINUTES = 5 * 60 * 1000
// 5 failed attempts per IP per 15 minutes before lockout
const LOGIN_LIMIT = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        ipKey: { label: '', type: 'text' }, // forwarded by middleware for rate-limit key
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = normalizeEmail(credentials.email as string)
        // Rate-limit by email (prevents targeted brute-force even across IPs)
        const emailKey = `email:${email}`
        const rl = rateLimit('login', emailKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)
        if (!rl.allowed) {
          const mins = Math.ceil(rl.retryAfterMs / 60000)
          throw new Error(`too_many_attempts:${mins}`)
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        // Successful login — clear the rate-limit bucket
        resetLimit('login', emailKey)

        // Block non-approved freelancers with specific error codes
        if (user.role === 'FREELANCER') {
          if (user.freelancerStatus === 'PENDING') {
            throw new Error('pending_approval')
          }
          if (user.freelancerStatus === 'REJECTED') {
            throw new Error('account_rejected')
          }
          if (user.freelancerStatus === 'SUSPENDED') {
            throw new Error('account_suspended')
          }
          if (user.freelancerStatus !== 'APPROVED') {
            throw new Error('account_not_approved')
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          freelancerStatus: user.freelancerStatus ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first login — populate token from user object
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.freelancerStatus = (user as { freelancerStatus?: string | null }).freelancerStatus ?? null
        token.checkedAt = Date.now()
        return token
      }

      // Periodic re-check for freelancers (every 5 min)
      if (
        token.role === 'FREELANCER' &&
        token.checkedAt &&
        Date.now() - token.checkedAt > FIVE_MINUTES
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { freelancerStatus: true },
        })
        if (dbUser) {
          token.freelancerStatus = dbUser.freelancerStatus ?? null
          token.checkedAt = Date.now()
        }
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.freelancerStatus = (token.freelancerStatus as string | null) ?? null
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
