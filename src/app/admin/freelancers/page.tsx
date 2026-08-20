'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Freelancer {
  id: string
  name: string
  email: string
  phone: string | null
  freelancerStatus: string | null
  appliedAt: string | null
  _count: { assignedContacts: number; calls: number }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  APPROVED: 'bg-green-950 text-green-400 border border-green-800',
  REJECTED: 'bg-red-950 text-red-400 border border-red-800',
  SUSPENDED: 'bg-orange-950 text-orange-400 border border-orange-800',
}

export default function FreelancersPage() {
  const router = useRouter()
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/freelancers')
      .then(r => r.json())
      .then(data => { setFreelancers(data); setLoading(false) })
  }, [])

  const pending = freelancers.filter(f => f.freelancerStatus === 'PENDING')

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm hover:text-white mb-1">← Admin</button>
            <h1 className="text-xl font-bold text-white">Freelancers</h1>
          </div>
          {pending.length > 0 && (
            <Link href="/admin/freelancers/pending"
              className="bg-yellow-950 text-yellow-400 border border-yellow-800 px-3 py-1.5 rounded-lg text-sm font-medium">
              {pending.length} Pending
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : freelancers.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No freelancers yet.</p>
        ) : (
          <div className="space-y-3">
            {freelancers.map(f => (
              <Link key={f.id} href={`/admin/freelancers/${f.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{f.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[f.freelancerStatus ?? ''] ?? 'bg-gray-800 text-gray-400'}`}>
                        {f.freelancerStatus ?? 'UNKNOWN'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{f.email}</p>
                    {f.phone && <p className="text-xs text-gray-500">{f.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-white">{f._count.assignedContacts}</p>
                    <p className="text-xs text-gray-500">contacts</p>
                    <p className="text-xs text-gray-600 mt-1">{f._count.calls} calls</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
