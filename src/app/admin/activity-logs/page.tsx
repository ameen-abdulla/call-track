'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { History, ArrowLeft, Search, Filter, ShieldCheck, UserCheck, Trash2, Edit, RefreshCw } from 'lucide-react'

interface ActivityLogItem {
  id: string
  action: string
  targetType: string
  targetId: string | null
  metadata: string | null
  createdAt: string
  actor: {
    name: string
    email: string
    role: string
  }
}

const ACTION_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CONTACT_EDITED: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/20' },
  CONTACT_DELETED: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300', border: 'border-red-500/20' },
  CONTACT_RESTORED: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/20' },
  CONTACT_CREATED: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/20' },
  BULK_ASSIGN: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/20' },
  FREELANCER_APPROVED: { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/20' },
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    const query = new URLSearchParams()
    if (filterAction) query.set('action', filterAction)

    fetch(`/api/admin/activity-logs?${query.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filterAction])

  const filtered = logs.filter(log => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(s) ||
      log.actor.name.toLowerCase().includes(s) ||
      (log.metadata && log.metadata.toLowerCase().includes(s))
    )
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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Administrative Audit Trail</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Append-only tamper-evident security record of system administrative actions
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
            {logs.length} Logged Events
          </span>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 flex gap-2 flex-wrap items-center shadow-[var(--shadow-card)]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search by actor, metadata diff, target..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="">All Action Types</option>
            <option value="CONTACT_EDITED">Contact Edited</option>
            <option value="CONTACT_DELETED">Contact Deleted</option>
            <option value="CONTACT_RESTORED">Contact Restored</option>
            <option value="CONTACT_CREATED">Contact Created</option>
            <option value="BULK_ASSIGN">Bulk Assigned</option>
            <option value="FREELANCER_APPROVED">Freelancer Approved</option>
          </select>
        </div>

        {/* Log List */}
        {loading ? (
          <p className="text-center py-12 text-xs text-[var(--text-muted)]">Loading audit records...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-12 text-center text-xs text-[var(--text-muted)] space-y-1">
            <History className="w-6 h-6 mx-auto opacity-50 mb-1" />
            <p className="font-semibold text-[var(--text-primary)]">No activity events found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => {
              const badge = ACTION_BADGES[log.action] || { bg: 'bg-[var(--bg)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border)]' }
              let parsedMeta: Record<string, unknown> | null = null
              try {
                if (log.metadata) parsedMeta = JSON.parse(log.metadata)
              } catch {}

              return (
                <div
                  key={log.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        target <strong className="text-[var(--text-primary)] font-mono">{log.targetType}</strong>
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </span>
                  </div>

                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Actor: <strong className="text-[var(--text-primary)]">{log.actor.name}</strong> ({log.actor.email})
                  </div>

                  {parsedMeta && (
                    <div className="bg-[var(--bg)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(parsedMeta, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
