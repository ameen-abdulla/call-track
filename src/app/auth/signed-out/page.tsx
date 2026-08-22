'use client'

import Link from 'next/link'
import { ShieldCheck, LogIn, ArrowRight } from 'lucide-react'

export default function SignedOutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-raised)] text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)]">Signed Out Successfully</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Your authenticated session has ended securely.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-2.5 px-4 rounded-[var(--radius-md)] text-xs transition-colors shadow-xs"
          >
            <span>Sign back into Call Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
