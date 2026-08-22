'use client'

import Link from 'next/link'
import { LogOut, ArrowRight, ShieldCheck } from 'lucide-react'

export default function SignedOutPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <LogOut className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">You've been signed out</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your session has ended safely. Thank you for your work on Call Track.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 py-2 px-3 rounded-xl border border-green-200 dark:border-green-800">
          <ShieldCheck className="w-4 h-4" />
          <span>Session invalidated securely</span>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            <span>Sign back in</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}
