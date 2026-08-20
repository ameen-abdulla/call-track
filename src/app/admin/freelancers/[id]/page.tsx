'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

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
    status: string
    callPriority: string | null
    topic: string | null
    company: string | null
    tags: { tag: { id: string; name: string } }[]
    _count: { calls: number }
  }[]
  _count: { assignedContacts: number; calls: number }
}

interface ApprovedFreelancer {
  id: string
  name: string
  freelancerStatus: string | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-950 text-yellow-400',
  APPROVED: 'bg-green-950 text-green-400',
  REJECTED: 'bg-red-950 text-red-400',
  SUSPENDED: 'bg-orange-950 text-orange-400',
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
      setMessage(`✅ Reassigned ${data.reassigned} contacts successfully.`)
      setShowReassign(false)
      setFreelancer(f => f ? { ...f, assignedContacts: [], _count: { ...f._count, assignedContacts: 0 } } : f)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
  if (!freelancer) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-red-400">Freelancer not found.</p></div>

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin/freelancers')} className="text-gray-400 text-sm hover:text-white mb-4">← Freelancers</button>

        {message && (
          <div className="bg-blue-950 border border-blue-800 text-blue-300 text-sm px-4 py-3 rounded-xl mb-4">{message}</div>
        )}

        {/* Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-white">{freelancer.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[freelancer.freelancerStatus ?? ''] ?? 'bg-gray-800 text-gray-400'}`}>
                  {freelancer.freelancerStatus}
                </span>
              </div>
              <p className="text-sm text-gray-400">{freelancer.email}</p>
              {freelancer.phone && <p className="text-xs text-gray-500">{freelancer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">{freelancer._count?.assignedContacts ?? 0}</p>
              <p className="text-xs text-gray-500">contacts</p>
            </div>
          </div>
          {freelancer.applicationNote && (
            <div className="bg-gray-800 rounded-xl p-3 mt-3">
              <p className="text-xs text-gray-500 mb-1">Application Note</p>
              <p className="text-sm text-gray-300">{freelancer.applicationNote}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {freelancer.freelancerStatus === 'APPROVED' && (
          <div className="flex gap-2 mb-4">
            {(freelancer._count?.assignedContacts ?? 0) > 0 && (
              <button onClick={() => setShowReassign(!showReassign)}
                className="flex-1 bg-indigo-950 text-indigo-300 border border-indigo-800 py-2.5 rounded-xl text-sm font-semibold">
                Bulk Reassign {freelancer._count.assignedContacts} Contacts
              </button>
            )}
            <button onClick={suspend} disabled={suspending}
              className="flex-1 bg-orange-950 text-orange-400 border border-orange-800 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
              {suspending ? 'Suspending...' : 'Suspend'}
            </button>
          </div>
        )}

        {showReassign && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
            <p className="text-sm font-medium text-white mb-3">Reassign all contacts to:</p>
            <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none">
              <option value="">Select a freelancer...</option>
              {allFreelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button onClick={reassignAll} disabled={!reassignTo || reassigning}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
              {reassigning ? 'Reassigning...' : 'Confirm Bulk Reassign'}
            </button>
          </div>
        )}

        {/* Assigned Contacts */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Assigned Contacts ({freelancer.assignedContacts?.length ?? 0})</h2>
        {(!freelancer.assignedContacts || freelancer.assignedContacts.length === 0) ? (
          <p className="text-gray-600 text-sm text-center py-6">No contacts assigned.</p>
        ) : (
          <div className="space-y-2">
            {freelancer.assignedContacts.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {c.tags.map(t => (
                          <span key={t.tag.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t.tag.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {c.callPriority && <span className="text-xs font-bold text-blue-400">Priority {c.callPriority}</span>}
                    <p className="text-xs text-gray-600">{c._count?.calls ?? 0} calls</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
