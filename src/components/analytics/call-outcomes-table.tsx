'use client'

import { useEffect, useState, useTransition } from 'react'
import { Phone, Users, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw, MessageSquare, AlertCircle, PhoneCall } from 'lucide-react'

export interface CallLogItem {
  id: string
  outcome: string
  responseLookup?: string | null
  recommendedAction?: string | null
  interestLevel?: string | null
  notes?: string | null
  calledAt: string
  scheduledAt?: string | null
  duration?: number | string | null
  contact?: {
    id: string
    name: string
    phone: string
    email?: string | null
    company?: string | null
    status: string
  } | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

interface FreelancerOption {
  id: string
  name: string
  email: string
}

export function getOutcomeChip(outcome: string) {
  const norm = (outcome || '').toLowerCase().trim()

  if (norm === 'answered' || norm === 'connected') {
    return {
      label: 'Answered',
      className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    }
  }
  if (norm === 'no_answer' || norm === 'unreachable' || norm === 'no-answer' || norm === 'no answer / unreachable') {
    return {
      label: 'No Answer',
      className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    }
  }
  if (norm === 'busy') {
    return {
      label: 'Busy',
      className: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    }
  }
  if (
    norm === 'callback' ||
    norm === 'callback_requested' ||
    norm === 'call back later' ||
    norm.includes('callback') ||
    norm.includes('call back')
  ) {
    return {
      label: 'Callback',
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    }
  }
  if (norm === 'voicemail' || norm === 'voice_mail') {
    return {
      label: 'Voicemail',
      className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    }
  }
  if (norm === 'not_interested' || norm === 'not interested' || norm === 'lost') {
    return {
      label: 'Not Interested',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    }
  }
  if (
    norm === 'converted' ||
    norm.includes('demo') ||
    norm.includes('quotation') ||
    norm.includes('interested')
  ) {
    return {
      label: outcome,
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    }
  }

  return {
    label: outcome.replace(/_/g, ' '),
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  }
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

function formatDuration(duration?: number | string | null) {
  if (duration === null || duration === undefined || duration === '') return '—'
  if (typeof duration === 'number') {
    if (duration < 60) return `${duration}s`
    const mins = Math.floor(duration / 60)
    const secs = duration % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return String(duration)
}

export function CallOutcomesTable({ initialFreelancerId }: { initialFreelancerId?: string }) {
  const [freelancers, setFreelancers] = useState<FreelancerOption[]>([])
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>(initialFreelancerId || 'all')
  const [logs, setLogs] = useState<CallLogItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // 1. Fetch freelancers list
  useEffect(() => {
    let ignore = false
    async function loadFreelancers() {
      try {
        const res = await fetch('/api/users?role=freelancer')
        if (res.ok && !ignore) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setFreelancers(data)
          }
        }
      } catch (err) {
        console.error('Error fetching freelancers for call logs:', err)
      }
    }
    loadFreelancers()
    return () => {
      ignore = true
    }
  }, [])

  // 2. Fetch call logs
  useEffect(() => {
    let ignore = false
    async function loadLogs() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedFreelancer && selectedFreelancer !== 'all') {
          params.set('userId', selectedFreelancer)
        }
        params.set('page', page.toString())
        params.set('limit', limit.toString())

        const res = await fetch(`/api/admin/call-logs?${params.toString()}`)
        if (res.ok && !ignore) {
          const data = await res.json()
          setLogs(data.logs || [])
          setTotal(data.total || 0)
        }
      } catch (err) {
        console.error('Error fetching call logs:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadLogs()
    return () => {
      ignore = true
    }
  }, [selectedFreelancer, page, limit, refreshKey])

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] overflow-hidden space-y-0">
      {/* Header & Filter Bar */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Call Outcomes & Activity Logs</h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
              {total} total calls
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Detailed breakdown of calling results, freelancer dispositions, and prospect notes
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Freelancer Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
              Freelancer:
            </label>
            <select
              value={selectedFreelancer}
              onChange={(e) => {
                setSelectedFreelancer(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">👥 All Freelancers</option>
              {freelancers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      {loading && logs.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
          <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[var(--accent)]" />
          <p>Loading call outcomes...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
          <div className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <PhoneCall className="w-5 h-5" />
          </div>
          <p className="font-semibold text-[var(--text-primary)] text-sm">No call logs found</p>
          <p className="text-[11px]">
            {selectedFreelancer !== 'all'
              ? 'This freelancer has not logged any calls yet.'
              : 'No call attempts or dispositions recorded in the system.'}
          </p>
        </div>
      ) : (
        <>
          {/* Table for md+ screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg)] border-b border-[var(--border-strong)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Date / Time</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Freelancer</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Outcome</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Notes & Recommendations</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {logs.map((log) => {
                  const outcomeBadge = getOutcomeChip(log.outcome)

                  return (
                    <tr key={log.id} className="hover:bg-[var(--accent-subtle)]/40 transition-colors">
                      {/* Date / Time */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                          <span>{formatDateTime(log.calledAt)}</span>
                        </div>
                      </td>

                      {/* Freelancer */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{log.user.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        {log.contact ? (
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{log.contact.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                              <span>📞 {log.contact.phone}</span>
                              {log.contact.company && (
                                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">
                                  · {log.contact.company}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">Unknown Contact</span>
                        )}
                      </td>

                      {/* Outcome Chip */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold border ${outcomeBadge.className}`}
                        >
                          {outcomeBadge.label}
                        </span>
                        {log.responseLookup && log.responseLookup !== log.outcome && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1 max-w-[140px]">
                            {log.responseLookup}
                          </p>
                        )}
                      </td>

                      {/* Notes & Recommendations */}
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                        {log.notes ? (
                          <p className="line-clamp-2">{log.notes}</p>
                        ) : log.recommendedAction ? (
                          <p className="italic text-[11px] text-[var(--text-muted)] line-clamp-1">
                            Action: {log.recommendedAction}
                          </p>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">No notes</span>
                        )}
                        {log.scheduledAt && (
                          <p className="text-[10px] text-[var(--accent)] font-medium mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Next scheduled: {formatDateTime(log.scheduledAt)}
                          </p>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDuration(log.duration)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-3 bg-[var(--bg)] border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="text-[11px] text-[var(--text-secondary)] font-mono">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} results
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-raised)] transition-colors flex items-center gap-1 text-[11px] font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-[11px] font-mono text-[var(--text-secondary)] px-1">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-raised)] transition-colors flex items-center gap-1 text-[11px] font-medium"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
