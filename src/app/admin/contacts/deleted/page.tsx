'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2, RotateCcw, ArrowLeft, Search, CheckCircle2 } from 'lucide-react'

interface DeletedContact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  company?: string | null
  deletedAt: string
  createdBy?: { name: string }
  tags?: { tag: { id: string; name: string } }[]
}

export default function DeletedContactsPage() {
  const [contacts, setContacts] = useState<DeletedContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadDeleted = () => {
    fetch('/api/admin/contacts/deleted')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setContacts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadDeleted()
  }, [])

  const handleRestore = async (id: string, name: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/contacts/${id}/restore`, { method: 'POST' })
      if (res.ok) {
        setMessage(`Restored "${name}" back to active contact pool.`)
        loadDeleted()
      } else {
        alert('Failed to restore contact')
      }
    } catch {
      alert('Error connecting to server')
    } finally {
      setRestoringId(null)
    }
  }

  const filtered = contacts.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.name.toLowerCase().includes(s) || c.phone.includes(s) || (c.company && c.company.toLowerCase().includes(s))
  })

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/admin"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs flex items-center gap-1 mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Soft-Deleted Contacts Pool</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Archived contacts can be safely reviewed and restored with their complete audit history
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            {contacts.length} Archived Records
          </span>
        </div>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs px-3.5 py-2.5 rounded-[var(--radius-sm)] flex items-center justify-between">
            <span>✓ {message}</span>
            <button onClick={() => setMessage('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search archived contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none shadow-xs"
          />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center py-12 text-xs text-[var(--text-muted)]">Loading deleted pool...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-12 text-center text-xs text-[var(--text-muted)] space-y-1">
            <Trash2 className="w-6 h-6 mx-auto opacity-50 mb-1" />
            <p className="font-semibold text-[var(--text-primary)]">Deleted pool is currently empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(contact => (
              <div
                key={contact.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--text-primary)]">{contact.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-[var(--radius-sm)] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      Deleted {new Date(contact.deletedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {contact.company && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{contact.company}</p>}

                  <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-muted)] mt-1">
                    <span>📞 {contact.phone}</span>
                    {contact.phone2 && <span>📱 {contact.phone2}</span>}
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(contact.id, contact.name)}
                  disabled={restoringId === contact.id}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{restoringId === contact.id ? 'Restoring...' : 'Restore'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
