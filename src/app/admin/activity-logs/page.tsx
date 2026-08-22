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

const ACTION_ICONS: Record<string, typeof History> = {
  CONTACT_EDITED: Edit,
  CONTACT_DELETED: Trash2,
  CONTACT_RESTORED: RefreshCw,
  CONTACT_CREATED: ShieldCheck,
  BULK_ASSIGN: UserCheck,
  FREELANCER_APPROVED: UserCheck,
}

const ACTION_BADGES: Record<string, string> = {
  CONTACT_EDITED: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  CONTACT_DELETED: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  CONTACT_RESTORED: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  CONTACT_CREATED: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  BULK_ASSIGN: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  FREELANCER_APPROVED: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
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
            <h1 className="text-2xl font-bold">Administrative Audit Logs</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Append-only security and activity record of all administrative changes in Call Track.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {logs.length} Logged Events
          </span>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search audit trail by actor, diff, or action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none"
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
          <p className="text-center py-12 text-gray-500 text-sm">Loading audit events...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 space-y-2">
            <History className="w-8 h-8 mx-auto opacity-40" />
            <p className="font-semibold text-gray-800 dark:text-gray-200">No activity events recorded</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(log => {
              const Icon = ACTION_ICONS[log.action] || History
              let parsedMeta: Record<string, unknown> | null = null
              try {
                if (log.metadata) parsedMeta = JSON.parse(log.metadata)
              } catch {
                // not json
              }

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${ACTION_BADGES[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        on <strong className="text-gray-800 dark:text-gray-200">{log.targetType}</strong>
                      </span>
                    </div>

                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span>Performed by: <strong className="text-gray-900 dark:text-white">{log.actor.name}</strong> ({log.actor.email})</span>
                  </div>

                  {parsedMeta && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700/60 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
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
