import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function requireAuth(requiredRole?: string) {
  const session = await auth()
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null }
  }
  if (requiredRole) {
    const normalizedRole =
      requiredRole.toUpperCase() === 'ADMIN'
        ? 'ADMIN'
        : requiredRole.toUpperCase() === 'AGENT' || requiredRole.toUpperCase() === 'FREELANCER'
        ? 'FREELANCER'
        : requiredRole

    if (session.user.role !== normalizedRole) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null }
    }
  }
  return { error: null, session }
}
