'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Search, CheckCircle2, AlertCircle, Phone, Mail } from 'lucide-react'

interface Freelancer {
  id: string
  name: string
  email: string
  phone: string | null
  freelancerStatus: string | null
  applicationNote: string | null
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
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFreelancer, setNewFreelancer] = useState({ name: '', email: '', phone: '', password: '', applicationNote: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const loadFreelancers = () => {
    fetch('/api/admin/freelancers')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFreelancers(data)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadFreelancers()
  }, [])

  const pending = freelancers.filter(f => f.freelancerStatus === 'PENDING')
  const approved = freelancers.filter(f => f.freelancerStatus === 'APPROVED')

  const filtered = freelancers.filter(f => {
    if (!search) return true
    const s = search.toLowerCase()
    return f.name.toLowerCase().includes(s) || f.email.toLowerCase().includes(s) || (f.phone && f.phone.includes(s))
  })

  async function handleCreateFreelancer(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    try {
      const res = await fetch('/api/admin/freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFreelancer),
      })
      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create freelancer')
      } else {
        setShowAddModal(false)
        setNewFreelancer({ name: '', email: '', phone: '', password: '', applicationNote: '' })
        loadFreelancers()
      }
    } catch {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm hover:text-white mb-1">
              ← Back to Admin Dashboard
            </button>
            <h1 className="text-2xl font-bold text-white">Freelancer Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage caller accounts, review applications, and create new freelancers.</p>
          </div>
          
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <Link
                href="/admin/freelancers/pending"
                className="bg-yellow-950 hover:bg-yellow-900 text-yellow-400 border border-yellow-800 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" />
                {pending.length} Pending Approval
              </Link>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-950"
            >
              <UserPlus className="w-4 h-4" />
              Add Freelancer
            </button>
          </div>
        </div>

        {/* Stats summary banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <span className="text-xs text-gray-400">Total Freelancers</span>
            <p className="text-xl font-bold text-white mt-0.5">{freelancers.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <span className="text-xs text-green-400">Active / Approved</span>
            <p className="text-xl font-bold text-green-400 mt-0.5">{approved.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <span className="text-xs text-yellow-400">Pending Review</span>
            <p className="text-xl font-bold text-yellow-400 mt-0.5">{pending.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <span className="text-xs text-blue-400">Total Assigned Leads</span>
            <p className="text-xl font-bold text-blue-400 mt-0.5">
              {freelancers.reduce((acc, f) => acc + (f._count?.assignedContacts || 0), 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search freelancers by name, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List of Freelancers */}
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading freelancers...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
            <p className="text-lg font-semibold text-white">No freelancers found</p>
            <p className="text-xs text-gray-500 mt-1">Click "Add Freelancer" above or share the signup page (`/register`) with callers.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(f => (
              <Link
                key={f.id}
                href={`/admin/freelancers/${f.id}`}
                className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-white text-base hover:text-blue-400 transition-colors">{f.name}</p>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[f.freelancerStatus ?? ''] ?? 'bg-gray-800 text-gray-400'}`}>
                        {f.freelancerStatus ?? 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gray-500" /> {f.email}</span>
                      {f.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-500" /> {f.phone}</span>}
                    </div>

                    {f.applicationNote && (
                      <p className="text-xs text-gray-400 mt-2 bg-gray-800/60 p-2 rounded-lg line-clamp-1">
                        Note: {f.applicationNote}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 bg-gray-800/40 p-2.5 rounded-xl border border-gray-800 min-w-[90px]">
                    <p className="text-base font-bold text-white">{f._count?.assignedContacts ?? 0}</p>
                    <p className="text-[11px] text-gray-400">contacts</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{f._count?.calls ?? 0} calls</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Freelancer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Create Approved Freelancer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFreelancer} className="p-4 space-y-3">
              {createError && (
                <div className="bg-red-950 border border-red-900 text-red-300 text-xs p-3 rounded-xl">
                  {createError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-300">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newFreelancer.name}
                  onChange={e => setNewFreelancer(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={newFreelancer.email}
                  onChange={e => setNewFreelancer(p => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Phone Number (optional)</label>
                <input
                  type="tel"
                  placeholder="+974..."
                  value={newFreelancer.phone}
                  onChange={e => setNewFreelancer(p => ({ ...p, phone: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Password * (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newFreelancer.password}
                  onChange={e => setNewFreelancer(p => ({ ...p, password: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Admin Notes / Referral (optional)</label>
                <textarea
                  placeholder="Internal note about this freelancer..."
                  value={newFreelancer.applicationNote}
                  onChange={e => setNewFreelancer(p => ({ ...p, applicationNote: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creating || !newFreelancer.name || !newFreelancer.email || !newFreelancer.password}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-950"
                >
                  {creating ? 'Creating Freelancer...' : 'Create Approved Freelancer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
