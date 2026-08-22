'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'

interface PendingUser {
  id: string
  name: string
  email: string
  phone: string | null
  applicationNote: string | null
  appliedAt: string | null
}

export default function PendingFreelancersPage() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/freelancers')
      .then(r => r.json())
      .then(data => {
        setPending(data.filter((f: PendingUser & { freelancerStatus: string }) => f.freelancerStatus === 'PENDING'))
        setLoading(false)
      })
  }, [])

  async function approve(id: string) {
    setActionId(id)
    await fetch(`/api/admin/freelancers/${id}/approve`, { method: 'POST' })
    setPending(p => p.filter(u => u.id !== id))
    setActionId(null)
  }

  async function reject(id: string) {
    setActionId(id)
    await fetch(`/api/admin/freelancers/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    setPending(p => p.filter(u => u.id !== id))
    setRejectTarget(null)
    setRejectReason('')
    setActionId(null)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/admin/freelancers"
          className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Freelancers
        </Link>

        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pending Caller Applications</h1>
          <p className="text-xs text-[var(--text-secondary)]">Review applicant details and approve caller access to Call Track</p>
        </div>

        {loading ? (
          <p className="text-center py-12 text-xs text-[var(--text-muted)]">Loading applications...</p>
        ) : pending.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-12 text-center text-xs text-[var(--text-muted)] space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-sm text-[var(--text-primary)]">No Pending Applications</p>
            <p>All caller signups have been processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(u => (
              <div
                key={u.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-[var(--text-primary)]">{u.name}</p>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-[var(--radius-sm)] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Pending Review
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 space-y-0.5">
                    <p>✉️ {u.email}</p>
                    {u.phone && <p>📞 {u.phone}</p>}
                    {u.appliedAt && (
                      <p className="text-[var(--text-muted)]">
                        Applied: {new Date(u.appliedAt).toLocaleDateString([], { dateStyle: 'long' })}
                      </p>
                    )}
                  </div>
                </div>

                {u.applicationNote && (
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">Application Note: </span>
                    {u.applicationNote}
                  </div>
                )}

                {rejectTarget === u.id ? (
                  <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)..."
                      rows={2}
                      className="w-full px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reject(u.id)}
                        disabled={actionId === u.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold shadow-xs"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setRejectTarget(null)}
                        className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg)] py-1.5 rounded-[var(--radius-sm)] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                    <button
                      onClick={() => approve(u.id)}
                      disabled={actionId === u.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors shadow-xs"
                    >
                      Approve Access
                    </button>
                    <button
                      onClick={() => setRejectTarget(u.id)}
                      className="px-4 border border-red-500/30 text-red-600 hover:bg-red-500/10 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
