import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    if (session && pathname === '/login') {
      const dest = session.user.role === 'admin' ? '/admin' : '/secretary'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Protected routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-based routing
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/secretary', req.url))
  }
  if (pathname.startsWith('/secretary') && session.user.role !== 'agent') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
