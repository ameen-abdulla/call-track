import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const FIVE_MINUTES = 5 * 60 * 1000

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

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
