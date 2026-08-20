'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Tag {
  id: string
  name: string
  _count: { contacts: number }
}

export default function TagsPage() {
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => fetch('/api/admin/tags').then(r => r.json()).then(data => { if (Array.isArray(data)) setTags(data) })
  useEffect(() => { load() }, [])

  async function create() {
    if (!newName.trim()) return
    setCreating(true); setError('')
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setCreating(false)
    if (res.ok) { setNewName(''); load() }
    else { const d = await res.json(); setError(d.error) }
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"? This removes it from all contacts.`)) return
    await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm hover:text-white mb-4">← Admin</button>
        <h1 className="text-xl font-bold text-white mb-6">Tag Management</h1>

        {/* Create */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-400 mb-2">Add new tag</p>
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="Tag name..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={create} disabled={!newName.trim() || creating}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
              Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {tags.map(tag => (
            <div key={tag.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">{tag.name}</p>
                <p className="text-xs text-gray-500">{tag._count?.contacts ?? 0} contacts</p>
              </div>
              <button onClick={() => deleteTag(tag.id, tag.name)}
                className="text-gray-600 hover:text-red-400 text-sm px-2 py-1">
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
