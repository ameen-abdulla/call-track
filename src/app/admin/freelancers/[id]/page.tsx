'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, UserCheck, ShieldAlert, Phone, Mail, RotateCcw, AlertTriangle, Users } from 'lucide-react'

interface FreelancerDetail {
  id: string
  name: string
  email: string
  phone: string | null
  freelancerStatus: string | null
  applicationNote: string | null
  appliedAt: string | null
  reviewedAt: string | null
  suspendedAt: string | null
  assignedContacts: {
    id: string
    name: string
    phone: string
    phone2?: string | null
    status: string
    callPriority: string | null
    topic: string | null
    company: string | null
    tags: { tag: { id: string; name: string } }[]
    _count: { calls: number; interactions: number }
  }[]
  _count: { assignedContacts: number; calls: number; interactions: number }
}

interface ApprovedFreelancer {
  id: string
  name: string
  freelancerStatus: string | null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/20' },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/20' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300', border: 'border-red-500/20' },
  SUSPENDED: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/20' },
}

export default function FreelancerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [freelancer, setFreelancer] = useState<FreelancerDetail | null>(null)
  const [allFreelancers, setAllFreelancers] = useState<ApprovedFreelancer[]>([])
  const [loading, setLoading] = useState(true)
  const [suspending, setSuspending] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [reassignTo, setReassignTo] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [deletingModal, setDeletingModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/freelancers/${id}`).then(r => r.json()),
      fetch('/api/admin/freelancers').then(r => r.json()),
    ]).then(([detail, all]) => {
      setFreelancer(detail)
      setAllFreelancers(Array.isArray(all) ? all.filter((f: ApprovedFreelancer) => f.freelancerStatus === 'APPROVED' && f.id !== id) : [])
      setLoading(false)
    })
  }, [id])

  async function suspend() {
    if (!confirm('Suspend this freelancer? They will lose access immediately.')) return
    setSuspending(true)
    const res = await fetch(`/api/admin/freelancers/${id}/suspend`, { method: 'POST' })
    const data = await res.json()
    setSuspending(false)
    if (res.ok) {
      setFreelancer(f => f ? { ...f, freelancerStatus: 'SUSPENDED' } : f)
      if (data.warning) setMessage(data.warning)
    }
  }

  async function reassignAll() {
    if (!reassignTo) return
    setReassigning(true)
    const res = await fetch(`/api/admin/freelancers/${id}/reassign-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: reassignTo }),
    })
    const data = await res.json()
    setReassigning(false)
    if (res.ok) {
      setMessage(`Reassigned ${data.reassigned} contacts successfully.`)
      setShowReassign(false)
      setFreelancer(f => f ? { ...f, assignedContacts: [], _count: { ...f._count, assignedContacts: 0 } } : f)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/freelancers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Freelancer deleted.')
        router.push('/admin/freelancers')
      } else {
        alert(data.error || 'Failed to delete freelancer')
      }
    } catch {
      alert('Error connecting to server')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs text-[var(--text-muted)]">Loading freelancer profile...</div>
  if (!freelancer) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs text-red-500">Freelancer not found.</div>

  const statusStyle = STATUS_STYLES[freelancer.freelancerStatus ?? ''] ?? { bg: 'bg-[var(--bg)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border)]' }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          href="/admin/freelancers"
          className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Freelancers
        </Link>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs px-3.5 py-2.5 rounded-[var(--radius-sm)] flex items-center justify-between">
            <span>✓ {message}</span>
            <button onClick={() => setMessage('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-base font-bold text-[var(--text-primary)]">{freelancer.name}</h1>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded-[var(--radius-sm)] border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                  {freelancer.freelancerStatus}
                </span>
              </div>
              <div className="text-xs font-mono text-[var(--text-secondary)] space-y-0.5">
                <p>✉️ {freelancer.email}</p>
                {freelancer.phone && <p>📞 {freelancer.phone}</p>}
              </div>
            </div>

            <div className="text-right font-mono bg-[var(--bg)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)]">
              <p className="text-xl font-bold text-[var(--text-primary)]">{freelancer._count?.assignedContacts ?? 0}</p>
              <p className="text-[10px] text-[var(--text-muted)]">contacts assigned</p>
            </div>
          </div>

          {freelancer.applicationNote && (
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Application / Admin Note: </span>
              {freelancer.applicationNote}
            </div>
          )}

          {/* Action Row */}
          <div className="flex gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
            {(freelancer._count?.assignedContacts ?? 0) > 0 && (
              <button
                onClick={() => setShowReassign(!showReassign)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Bulk Reassign ({freelancer._count.assignedContacts}) Contacts
              </button>
            )}

            {freelancer.freelancerStatus === 'APPROVED' && (
              <button
                onClick={suspend}
                disabled={suspending}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                {suspending ? 'Suspending...' : 'Suspend Account'}
              </button>
            )}

            <button
              onClick={() => setDeletingModal(true)}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Freelancer</span>
            </button>
          </div>
        </div>

        {/* Bulk Reassign Card */}
        {showReassign && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-2.5 text-xs">
            <h3 className="font-semibold text-[var(--text-primary)]">Reassign All Contacts To:</h3>
            <select
              value={reassignTo}
              onChange={e => setReassignTo(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">-- Choose target caller --</option>
              {allFreelancers.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReassign(false)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={reassignAll}
                disabled={!reassignTo || reassigning}
                className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Bulk Reassign'}
              </button>
            </div>
          </div>
        )}

        {/* Assigned Contacts List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span>Assigned Contacts ({freelancer.assignedContacts?.length ?? 0})</span>
          </div>

          {(!freelancer.assignedContacts || freelancer.assignedContacts.length === 0) ? (
            <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)]">
              No contacts currently assigned.
            </div>
          ) : (
            <div className="space-y-2">
              {freelancer.assignedContacts.map(c => (
                <div
                  key={c.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-card)] flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{c.name}</p>
                    <p className="font-mono text-[var(--text-muted)] mt-0.5">{c.phone}</p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {c.tags.map(t => (
                          <span key={t.tag.id} className="text-[10px] bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] px-1.5 py-0.2 rounded-full">
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-mono">
                    {c.callPriority && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                        Priority {c.callPriority}
                      </span>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{c._count?.calls ?? 0} calls</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-sm p-5 shadow-[var(--shadow-modal)] space-y-3 text-xs">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Delete Freelancer Account?</h3>
            </div>

            <p className="text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete <strong>{freelancer.name}</strong>?
            </p>

            {(freelancer._count?.assignedContacts ?? 0) > 0 && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold">
                ⚠️ {freelancer._count.assignedContacts} contacts will be unassigned and returned to the Unassigned Pool.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingModal(false)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
