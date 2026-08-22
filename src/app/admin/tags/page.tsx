'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Tag as TagIcon, Plus, Trash2, ArrowLeft, Info, Search, FolderTree } from 'lucide-react'

interface Tag {
  id: string
  name: string
  _count: { contacts: number }
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadTags = () => {
    fetch('/api/admin/tags')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTags(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadTags()
  }, [])

  async function createTag(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setNewName('')
        setSuccessMsg(`Tag "${d.name}" created successfully.`)
        loadTags()
      } else {
        setError(d.error || 'Failed to create tag')
      }
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"? This will detach the tag from all associated contacts.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessMsg(`Tag "${name}" removed.`)
        loadTags()
      } else {
        alert('Failed to delete tag')
      }
    } catch {
      alert('Error connecting to server')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Contact Category Tags</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Organize and segment prospects by industry, organization type, or calling campaign.
            </p>
          </div>

          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
            {tags.length} Active Categories
          </span>
        </div>

        {/* Explanatory Guidance Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] flex items-start gap-3 text-xs">
          <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] text-[var(--accent)] shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-[var(--text-primary)]">What are Category Tags used for?</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Category tags allow you to classify leads into business sectors (e.g. <em>Driving Schools, International Schools, Fleet Transport, Government, Logistics</em>).
              They enable:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-0.5 pt-0.5">
              <li>Filtering the <strong>Coverage by Tag</strong> chart in the Command Center.</li>
              <li>Targeted bulk assignment of specific industries to specialized freelancers.</li>
              <li>Segmenting your calling lists when importing CSV files.</li>
            </ul>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs px-3.5 py-2.5 rounded-[var(--radius-sm)] flex items-center justify-between">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Create New Tag Box */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Create New Category Tag</span>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-[var(--radius-sm)] border border-red-500/20">{error}</p>
          )}

          <form onSubmit={createTag} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Heavy Equipment Fleet, Limousine Transport..."
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-[var(--radius-sm)] text-xs font-semibold shadow-xs transition-colors"
            >
              {creating ? 'Creating...' : 'Add Tag'}
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search existing categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none shadow-xs"
          />
        </div>

        {/* Tag Grid / List */}
        {loading ? (
          <p className="text-center py-12 text-xs text-[var(--text-muted)]">Loading tags...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-12 text-center text-xs text-[var(--text-muted)] space-y-1">
            <TagIcon className="w-6 h-6 mx-auto opacity-50 mb-1" />
            <p className="font-semibold text-[var(--text-primary)]">No tags match the search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.map(tag => (
              <div
                key={tag.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-center justify-between gap-2 hover:border-[var(--accent)]/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{tag.name}</p>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                    {tag._count?.contacts ?? 0} prospects tagged
                  </p>
                </div>

                <button
                  onClick={() => deleteTag(tag.id, tag.name)}
                  disabled={deletingId === tag.id}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                  title="Delete Tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
