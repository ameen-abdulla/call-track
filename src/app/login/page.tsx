'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { ShieldCheck, LogIn } from 'lucide-react'

const errorMessages: Record<string, string> = {
  pending_approval: 'Your account is pending admin approval. Please wait for review.',
  account_rejected: 'Your application was not approved. Please contact support.',
  account_suspended: 'Your account has been suspended. Please contact your administrator.',
  account_status: 'Your account is not active. Please contact your administrator.',
  CredentialsSignin: 'Invalid email or password.',
}

function resolveError(code: string): string {
  // Handle dynamic too_many_attempts:N code
  if (code.startsWith('too_many_attempts')) {
    const mins = code.split(':')[1] ?? '15'
    return `Too many login attempts. Please wait ${mins} minute(s) and try again.`
  }
  return errorMessages[code] || 'An error occurred during sign in.'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(resolveError(urlError))
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(resolveError(result.error))
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-end mb-4">
        <ThemeToggle />
      </div>

      <div className="text-center mb-6">
        <div className="w-10 h-10 mx-auto rounded-[var(--radius-sm)] bg-[var(--accent)] text-white flex items-center justify-center font-bold text-lg shadow-sm mb-3">
          CT
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Call Track</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Tele-Calling Operations Platform</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-raised)] p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none min-h-[44px]"
              placeholder="caller@example.com"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none min-h-[44px]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs p-3 rounded-[var(--radius-sm)] border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-[var(--radius-sm)] font-semibold text-xs min-h-[44px] disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? 'Authenticating...' : 'Sign In to Command Center'}
          </button>
        </form>

        <p className="text-center text-[var(--text-muted)] text-xs pt-2 border-t border-[var(--border)]">
          New freelancer?{' '}
          <Link href="/register" className="text-[var(--accent)] hover:underline font-semibold">
            Register for access
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
