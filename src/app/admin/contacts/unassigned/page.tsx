'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  name: string
  phone: string
  phone2: string | null
  company: string | null
  status: string
  callPriority: string | null
  topic: string | null
  tags: { tag: { id: string; name: string } }[]
  _count: { calls: number }
}

interface Freelancer {
  id: string
  name: string
  freelancerStatus: string | null
  _count: { assignedContacts: number }
}

export default function UnassignedContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => Promise.all([
    fetch('/api/admin/contacts/unassigned').then(r => r.json()),
    fetch('/api/admin/freelancers').then(r => r.json()),
  ]).then(([c, f]) => {
    setContacts(Array.isArray(c) ? c : [])
    setFreelancers(Array.isArray(f) ? f.filter((fl: Freelancer) => fl.freelancerStatus === 'APPROVED') : [])
    setLoading(false)
  })

  useEffect(() => { load() }, [])

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function assign() {
    if (!assignTo || selected.length === 0) return
    setAssigning(true)
    const res = await fetch('/api/admin/contacts/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: selected, toUserId: assignTo }),
    })
    const data = await res.json()
    setAssigning(false)
    if (res.ok) {
      setMessage(`✅ Assigned ${data.assigned} contacts.`)
      setSelected([])
      setAssignTo('')
      load()
    } else {
      alert(data.error || 'Failed to assign contacts')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm hover:text-white mb-4">← Admin</button>
        <h1 className="text-xl font-bold text-white mb-2">Unassigned Contacts</h1>
        <p className="text-gray-500 text-sm mb-6">Select contacts below and assign them to a freelancer.</p>

        {message && <div className="bg-green-950 border border-green-800 text-green-300 text-sm px-4 py-3 rounded-xl mb-4">{message}</div>}

        {loading ? <p className="text-gray-500 text-center py-12">Loading...</p> : contacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-400">All contacts are assigned.</p>
          </div>
        ) : (
          <>
            {/* Bulk assign bar */}
            {selected.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mb-4 flex gap-2 items-center flex-wrap">
                <span className="text-sm text-white">{selected.length} selected</span>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none">
                  <option value="">Assign to...</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.name} ({f._count?.assignedContacts ?? 0})</option>)}
                </select>
                <button onClick={assign} disabled={!assignTo || assigning}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {assigning ? '...' : 'Assign'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`bg-gray-900 border rounded-xl p-3 cursor-pointer transition-colors ${
                    selected.includes(c.id) ? 'border-blue-500 bg-blue-950/20' : 'border-gray-800 hover:border-gray-700'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                      selected.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                    }`}>
                      {selected.includes(c.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white text-sm">{c.name}</p>
                        {c.callPriority && <span className="text-xs text-blue-400 font-bold">Priority {c.callPriority}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.tags.map(t => <span key={t.tag.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t.tag.name}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
