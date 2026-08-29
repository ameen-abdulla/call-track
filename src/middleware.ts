import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes — use startsWith('/login') so query strings like /login?error=... are also public
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname === '/auth/signed-out' ||
    pathname.startsWith('/api/auth')

  if (isPublic) {
    // Only bounce away from /login if the user is actually allowed in
    // (ADMIN always allowed; FREELANCER only if APPROVED)
    // Non-approved freelancers must stay on /login to avoid a redirect loop
    if (
      session &&
      (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
      (session.user.role === 'ADMIN' || session.user.freelancerStatus === 'APPROVED')
    ) {
      const dest = session.user.role === 'ADMIN' ? '/admin' : '/freelancer'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Not logged in
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Block non-approved freelancers on every protected route
  if (
    session.user.role === 'FREELANCER' &&
    session.user.freelancerStatus !== 'APPROVED'
  ) {
    return NextResponse.redirect(new URL('/login?error=account_status', req.url))
  }

  // Role-based routing
  if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/freelancer', req.url))
  }
  if (pathname.startsWith('/freelancer') && session.user.role !== 'FREELANCER') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
