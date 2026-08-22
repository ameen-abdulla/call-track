'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
        setMessage(`✅ Restored "${name}" back to active contact pool.`)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs flex items-center gap-1 mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Deleted Contacts Pool</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Soft-deleted contacts are archived here with full history and can be restored anytime.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {contacts.length} Deleted Records
          </span>
        </div>

        {message && (
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search deleted contacts by name, company, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center py-12 text-gray-500 text-sm">Loading deleted contacts...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 space-y-2">
            <Trash2 className="w-8 h-8 mx-auto opacity-40" />
            <p className="font-semibold text-gray-800 dark:text-gray-200">No deleted contacts in pool</p>
            <p className="text-xs text-gray-400">Contacts deleted by administrators will appear here for safe restoration.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(contact => (
              <div
                key={contact.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white text-base">{contact.name}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                      Deleted {new Date(contact.deletedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{contact.company}</p>}

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                    <span>📞 {contact.phone}</span>
                    {contact.phone2 && <span>📱 {contact.phone2}</span>}
                  </div>

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {contact.tags.map(t => (
                        <span key={t.tag.id} className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleRestore(contact.id, contact.name)}
                  disabled={restoringId === contact.id}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0"
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
