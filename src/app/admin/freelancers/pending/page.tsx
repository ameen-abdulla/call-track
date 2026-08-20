'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PendingUser {
  id: string
  name: string
  email: string
  phone: string | null
  applicationNote: string | null
  appliedAt: string | null
}

export default function PendingFreelancersPage() {
  const router = useRouter()
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
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin/freelancers')} className="text-gray-400 text-sm hover:text-white mb-4">← Freelancers</button>
        <h1 className="text-xl font-bold text-white mb-6">Pending Approvals</h1>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : pending.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-400">No pending applications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(u => (
              <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                    {u.phone && <p className="text-xs text-gray-500">{u.phone}</p>}
                    {u.appliedAt && <p className="text-xs text-gray-600 mt-1">Applied {new Date(u.appliedAt).toLocaleDateString()}</p>}
                  </div>
                </div>
                {u.applicationNote && (
                  <div className="bg-gray-800 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-400 mb-1">Application Note</p>
                    <p className="text-sm text-gray-300">{u.applicationNote}</p>
                  </div>
                )}

                {rejectTarget === u.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => reject(u.id)} disabled={actionId === u.id}
                        className="flex-1 bg-red-900 text-red-200 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                        Confirm Reject
                      </button>
                      <button onClick={() => setRejectTarget(null)}
                        className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-xl text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => approve(u.id)} disabled={actionId === u.id}
                      className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => setRejectTarget(u.id)}
                      className="flex-1 bg-gray-800 text-red-400 py-2.5 rounded-xl text-sm font-semibold">
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
