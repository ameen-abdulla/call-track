'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowUpDown,
  FileText,
  Calendar,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from 'next-auth/react'
import { UrgencyBadge } from '@/components/urgency-badge'
import { ContactUrgency } from '@/lib/urgency'
import { FEEDBACK_OPTIONS, INTEREST_AREAS } from '@/lib/feedback-constants'

interface Contact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  topic: string | null
  status: string
  company: string | null
  callPriority?: string | null
  tags?: { tag: { id: string; name: string } }[]
  urgency?: ContactUrgency
}

interface Activity {
  id: string
  activityType: string
  dueDate: string
  status: string
  contact: Contact
}

interface ActivityLogEntry {
  id: string
  calledAt: string
  outcome: string
  notes: string | null
  scheduledAt: string | null
  contact: {
    id: string
    name: string
    phone: string
    company: string | null
  }
  type?: string
  connected?: boolean | null
  response?: string | null
  interestArea?: string | null
  nextActivityRequired?: boolean
  nextActivity?: string | null
  source?: 'interaction' | 'call'
}

interface DashboardData {
  todaysCalls: Activity[]
  queue: Contact[]
  followUps: Activity[]
  activityLog?: ActivityLogEntry[]
  unreadCount: number
  urgencySummary?: { green: number; orange: number; red: number; attempted: number }
}

function getOutcomeBadge(outcome: string) {
  const norm = outcome?.toLowerCase().trim() || ''

  // Converted -> Emerald
  if (
    norm === 'converted' ||
    norm.includes('demo') ||
    norm.includes('quotation') ||
    norm === 'interested'
  ) {
    return {
      label: outcome || 'Converted',
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium',
    }
  }

  // Not Interested -> Red
  if (
    norm === 'not_interested' ||
    norm === 'not interested' ||
    norm === 'lost' ||
    norm.includes('no current requirement')
  ) {
    return {
      label: outcome || 'Not Interested',
      className: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-medium',
    }
  }

  // Callback -> Blue
  if (
    norm === 'callback' ||
    norm === 'callback_requested' ||
    norm.includes('call back') ||
    norm === 'follow_up' ||
    norm.includes('follow-up') ||
    norm.includes('email') ||
    norm.includes('management approval')
  ) {
    return {
      label: outcome || 'Callback',
      className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium',
    }
  }

  // Busy -> Orange
  if (norm === 'busy' || norm.includes('busy')) {
    return {
      label: outcome || 'Busy',
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium',
    }
  }

  // No answer -> Gray
  if (
    norm === 'no_answer' ||
    norm === 'no answer' ||
    norm.includes('unreachable') ||
    norm.includes('wrong contact') ||
    norm.includes('not available') ||
    norm === 'unanswered'
  ) {
    return {
      label: outcome || 'No Answer',
      className: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 font-medium',
    }
  }

  // Answered / Connected -> Green
  if (
    norm === 'answered' ||
    norm === 'connected' ||
    norm.includes('answer') ||
    norm.includes('gps') ||
    norm.includes('provider') ||
    norm.includes('expensive')
  ) {
    return {
      label: outcome || 'Answered',
      className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 font-medium',
    }
  }

  return {
    label: outcome || 'Logged',
    className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium',
  }
}

function formatCallTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return (
      d.toLocaleDateString('en-AE', {
        month: 'short',
        day: 'numeric',
      }) +
      ' · ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    return dateStr
  }
}

export default function FreelancerDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'schedule' | 'followups' | 'activity'>('queue')
  const [queueSort, setQueueSort] = useState<'priority' | 'urgency'>('priority')
  const [loading, setLoading] = useState(true)

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<ActivityLogEntry | null>(null)
  const [editResponse, setEditResponse] = useState<string>('')
  const [editInterestArea, setEditInterestArea] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [editConnected, setEditConnected] = useState<boolean>(true)
  const [editScheduleNext, setEditScheduleNext] = useState<boolean>(false)
  const [editNextDate, setEditNextDate] = useState<string>('')
  const [editActivityType, setEditActivityType] = useState<string>('call')
  const [editSaving, setEditSaving] = useState<boolean>(false)
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/agent/dashboard')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (err) {
      console.error('Error fetching caller dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleCall = (contactId: string) => {
    router.push(`/freelancer/call/${contactId}`)
  }

  const handleComplete = async (activityId: string) => {
    await fetch(`/api/activities/${activityId}/complete`, { method: 'PUT' })
    if (data) {
      setData({
        ...data,
        todaysCalls: data.todaysCalls.filter(a => a.id !== activityId),
        followUps: data.followUps.filter(a => a.id !== activityId),
      })
    }
  }

  const handleOpenEditModal = (entry: ActivityLogEntry) => {
    setEditingEntry(entry)
    setEditNotes(entry.notes || '')
    setEditResponse(entry.response || entry.outcome || '')
    setEditInterestArea(entry.interestArea || '')
    setEditConnected(entry.connected !== false && entry.outcome !== 'no_answer' && entry.outcome !== 'busy')
    if (entry.scheduledAt) {
      setEditScheduleNext(true)
      const d = new Date(entry.scheduledAt)
      setEditNextDate(d.toISOString().slice(0, 16))
    } else {
      setEditScheduleNext(false)
      const d = new Date()
      d.setDate(d.getDate() + 2)
      d.setHours(10, 0, 0, 0)
      setEditNextDate(d.toISOString().slice(0, 16))
    }
    setEditActivityType(entry.nextActivity || 'call')
    setEditSuccessMessage(null)
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    setEditSaving(true)
    try {
      const payload = {
        response: editConnected ? editResponse : 'No Answer / Unreachable',
        outcome: !editConnected ? 'no_answer' : editResponse,
        interestArea: editInterestArea || null,
        notes: editNotes || null,
        connected: editConnected,
        nextActivityRequired: editScheduleNext,
        nextActivityDate: editScheduleNext && editNextDate ? new Date(editNextDate).toISOString() : null,
        nextActivity: editScheduleNext ? editActivityType : null,
      }

      const res = await fetch(`/api/interactions/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        if (data?.activityLog) {
          setData({
            ...data,
            activityLog: data.activityLog.map(item =>
              item.id === editingEntry.id
                ? {
                    ...item,
                    outcome: payload.response || payload.outcome,
                    notes: payload.notes,
                    scheduledAt: payload.nextActivityDate,
                    response: payload.response,
                    interestArea: payload.interestArea,
                    connected: payload.connected,
                    nextActivityRequired: payload.nextActivityRequired,
                    nextActivity: payload.nextActivity,
                  }
                : item
            ),
          })
        }
        setEditSuccessMessage('✓ Saved!')
        setTimeout(() => {
          setEditingEntry(null)
          setEditSuccessMessage(null)
          fetchDashboard()
        }, 500)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to update record')
      }
    } catch (err) {
      console.error('Error updating activity log:', err)
      alert('Network error. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  const urgencyRank = (status?: string) => {
    if (status === 'red') return 0
    if (status === 'orange') return 1
    if (status === 'green') return 2
    if (status === 'attempted') return 3
    if (status === 'unassigned') return 4
    return 5
  }

  const sortedQueue = [...(data?.queue || [])].sort((a, b) => {
    if (queueSort === 'urgency') {
      const rankA = urgencyRank(a.urgency?.status)
      const rankB = urgencyRank(b.urgency?.status)
      if (rankA !== rankB) return rankA - rankB
      const hoursA = a.urgency?.hoursElapsed ?? 0
      const hoursB = b.urgency?.hoursElapsed ?? 0
      return hoursB - hoursA
    }
    return 0
  })

  const topQueueItem = sortedQueue[0]

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Mobile Top App Bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-[var(--text-primary)] truncate">
                {session?.user?.name || 'Caller'}
              </h1>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {new Date().toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signed-out' })}
              className="text-xs text-[var(--text-secondary)] hover:text-red-600 px-2 py-1 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Task Tabs */}
        <div className="max-w-md mx-auto px-4 flex border-t border-[var(--border)]">
          {[
            { key: 'queue', label: 'My Leads', count: data?.queue?.length },
            { key: 'schedule', label: "Today's Calls", count: data?.todaysCalls?.length },
            { key: 'followups', label: 'Follow-ups', count: data?.followUps?.length, alert: (data?.followUps?.length || 0) > 0 },
            { key: 'activity', label: 'Activity Log', count: data?.activityLog?.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all min-h-[44px] flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)]'
              }`}
            >
              <span>{tab.label}</span>
              {(tab.count ?? 0) > 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    tab.alert
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-[var(--bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-24">
        {/* Urgency Summary & Sort Controls */}
        {activeTab === 'queue' && (data?.queue?.length ?? 0) > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-2.5 flex items-center justify-between gap-2 shadow-xs text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
              {data?.urgencySummary ? (
                <>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      data.urgencySummary.red > 0
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {data.urgencySummary.red} Red
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      data.urgencySummary.orange > 0
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {data.urgencySummary.orange} Orange
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      data.urgencySummary.green > 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {data.urgencySummary.green} Green
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      data.urgencySummary.attempted > 0
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {data.urgencySummary.attempted} Attempted
                  </span>
                </>
              ) : null}
            </div>

            <button
              onClick={() => setQueueSort(queueSort === 'priority' ? 'urgency' : 'priority')}
              className={`px-2 py-1 rounded-[var(--radius-sm)] border text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors ${
                queueSort === 'urgency'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                  : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
              title="Toggle sorting between priority and urgency"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{queueSort === 'urgency' ? 'Urgent First' : 'Priority Sort'}</span>
            </button>
          </div>
        )}

        {/* Next Lead Banner */}
        {activeTab === 'queue' && topQueueItem && (
          <div className="bg-[var(--surface)] border-2 border-[var(--accent)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-raised)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                  Next Lead in Queue
                </span>
                {topQueueItem.callPriority && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-sm)] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Priority {topQueueItem.callPriority}
                  </span>
                )}
              </div>
              <UrgencyBadge urgency={topQueueItem.urgency} />
            </div>

            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{topQueueItem.name}</h2>
              {topQueueItem.company && (
                <p className="text-xs text-[var(--text-secondary)]">{topQueueItem.company}</p>
              )}
            </div>

            <div className="text-xs font-mono text-[var(--text-secondary)] space-y-0.5">
              <p>📞 {topQueueItem.phone}</p>
              {topQueueItem.phone2 && <p>📱 {topQueueItem.phone2}</p>}
            </div>

            {topQueueItem.topic && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Topic: </span>
                {topQueueItem.topic}
              </div>
            )}

            <button
              onClick={() => handleCall(topQueueItem.id)}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold py-3.5 rounded-[var(--radius-md)] text-sm flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[48px]"
            >
              <Phone className="w-4 h-4" />
              <span>Start Call Session</span>
            </button>
          </div>
        )}

        {/* Tab Lists */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading dashboard data...</div>
        ) : (
          <>
            {/* 1. Lead Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-2">
                {sortedQueue.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                    <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                    <p className="font-semibold text-[var(--text-primary)] text-sm">All Assigned Leads Contacted</p>
                    <p>Check with admin for new allocations.</p>
                  </div>
                ) : (
                  sortedQueue.map(contact => (
                    <div
                      key={contact.id}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{contact.name}</p>
                          {contact.callPriority && (
                            <span className="text-[9px] font-mono font-bold text-blue-600">P{contact.callPriority}</span>
                          )}
                          <UrgencyBadge urgency={contact.urgency} compact />
                        </div>
                        {contact.company && <p className="text-[11px] text-[var(--text-muted)]">{contact.company}</p>}
                        <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">{contact.phone}</p>
                      </div>

                      <button
                        onClick={() => handleCall(contact.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1 shrink-0 min-h-[40px]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. Today's Calls Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Today's Schedule</span>
                  <a
                    href={`/freelancer/calendar?date=${new Date().toISOString().slice(0, 10)}`}
                    className="text-[11px] text-[var(--accent)] hover:underline font-semibold"
                  >
                    View in Calendar →
                  </a>
                </div>
                {data?.todaysCalls?.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)]">
                    No calls scheduled for today
                  </div>
                ) : (
                  data?.todaysCalls?.map(activity => (
                    <div
                      key={activity.id}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-xs text-[var(--text-primary)]">{activity.contact.name}</p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">{activity.contact.phone}</p>
                        <p className="text-[11px] text-[var(--accent)] font-mono mt-1">
                          {activity.activityType.toUpperCase()} —{' '}
                          {new Date(activity.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleCall(activity.contact.id)}
                          className="bg-emerald-600 text-white px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </button>
                        <button
                          onClick={() => handleComplete(activity.id)}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Mark Done ✓
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Follow-ups Tab */}
            {activeTab === 'followups' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Overdue Follow-ups</span>
                  <a
                    href={`/freelancer/calendar?date=${new Date().toISOString().slice(0, 10)}`}
                    className="text-[11px] text-[var(--accent)] hover:underline font-semibold"
                  >
                    View in Calendar →
                  </a>
                </div>
                {data?.followUps?.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)]">
                    No overdue follow-ups
                  </div>
                ) : (
                  data?.followUps?.map(activity => (
                    <div
                      key={activity.id}
                      className="bg-[var(--surface)] border border-red-500/30 rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-xs text-[var(--text-primary)]">{activity.contact.name}</p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">{activity.contact.phone}</p>
                        <p className="text-[11px] text-red-600 font-mono font-bold mt-1">
                          OVERDUE · {new Date(activity.dueDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleCall(activity.contact.id)}
                          className="bg-emerald-600 text-white px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </button>
                        <button
                          onClick={() => handleComplete(activity.id)}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Mark Done ✓
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. Activity Log Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-2.5">
                {(data?.activityLog?.length ?? 0) === 0 ? (
                  <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-1 opacity-50" />
                    <p className="font-semibold text-[var(--text-primary)] text-sm">No calls logged yet.</p>
                    <p>Your logged call sessions and activity history will appear here.</p>
                  </div>
                ) : (
                  data?.activityLog?.map(entry => {
                    const badge = getOutcomeBadge(entry.outcome)
                    return (
                      <div
                        key={entry.id}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex flex-col gap-2.5"
                      >
                        {/* Top Row: Name, Outcome chip, Timestamp */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
                                {entry.contact.name}
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            {entry.contact.company && (
                              <p className="text-[11px] text-[var(--text-muted)] truncate">{entry.contact.company}</p>
                            )}
                            <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">📞 {entry.contact.phone}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              {formatCallTime(entry.calledAt)}
                            </p>
                          </div>
                        </div>

                        {/* Notes Preview (truncated) */}
                        {entry.notes && (
                          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2 text-xs text-[var(--text-secondary)]">
                            <p className="line-clamp-2">{entry.notes}</p>
                          </div>
                        )}

                        {/* Scheduled Follow-up timestamp */}
                        {entry.scheduledAt && (
                          <div className="text-[10px] text-[var(--accent)] font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Follow-up:{' '}
                              {new Date(entry.scheduledAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {/* Bottom Row: Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                          <button
                            onClick={() => handleCall(entry.contact.id)}
                            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call Again</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(entry)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--bg)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="w-3 h-3 text-[var(--accent)]" />
                            <span>View / Edit</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* View / Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-[var(--text-primary)]">Edit Call Feedback</h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {editingEntry.contact.name} · {formatCallTime(editingEntry.calledAt)}
                </p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Contact Info Snippet */}
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">{editingEntry.contact.name}</span>
                  {editingEntry.contact.company && (
                    <span className="text-[10px] text-[var(--text-muted)]">{editingEntry.contact.company}</span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-[var(--text-secondary)]">📞 {editingEntry.contact.phone}</p>
              </div>

              {/* Connected Switch */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--text-primary)] block">Did prospect answer?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditConnected(true)}
                    className={`py-2 px-3 rounded-[var(--radius-sm)] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editConnected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Yes — Connected</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditConnected(false)}
                    className={`py-2 px-3 rounded-[var(--radius-sm)] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      !editConnected
                        ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>No Answer / Busy</span>
                  </button>
                </div>
              </div>

              {/* Outcome / Response */}
              {editConnected && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)] block">
                    Standardized Response Outcome *
                  </label>
                  <select
                    value={editResponse}
                    onChange={e => {
                      setEditResponse(e.target.value)
                      const opt = FEEDBACK_OPTIONS.find(o => o.value === e.target.value)
                      if (opt) {
                        if (opt.nextActivityRequired === false) {
                          setEditScheduleNext(false)
                        } else {
                          setEditScheduleNext(true)
                          if (e.target.value.toLowerCase().includes('demo')) setEditActivityType('meeting')
                          else if (e.target.value.toLowerCase().includes('email')) setEditActivityType('email')
                          else setEditActivityType('call')
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">-- Choose prospect response --</option>
                    {FEEDBACK_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        [{opt.group}] {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Interest Area */}
              {editConnected && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-primary)] block">Interest Area (optional)</label>
                  <select
                    value={editInterestArea}
                    onChange={e => setEditInterestArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">-- Select solution area --</option>
                    {INTEREST_AREAS.map(area => (
                      <option key={area.value} value={area.value}>
                        {area.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Call Notes */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--text-primary)] block">Call Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Fleet size, existing supplier, decision-maker notes..."
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none resize-none"
                />
              </div>

              {/* Follow-up Activity — hidden for not-connected calls (auto-managed server-side) */}
              {editConnected ? (
                <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">Follow-up Activity</span>
                    <label className="flex items-center gap-1.5 text-[var(--text-secondary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editScheduleNext}
                        onChange={e => setEditScheduleNext(e.target.checked)}
                        className="rounded-[2px]"
                      />
                      <span>Schedule follow-up</span>
                    </label>
                  </div>

                  {editScheduleNext && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        {['call', 'email', 'meeting'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditActivityType(t)}
                            className={`flex-1 py-1.5 rounded-[var(--radius-sm)] border capitalize text-xs font-semibold ${
                              editActivityType === t
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <input
                        type="datetime-local"
                        value={editNextDate}
                        onChange={e => setEditNextDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-1 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span>Retry follow-up is automatically managed for unanswered calls.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--bg)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                disabled={editSaving}
                className="px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving || (editConnected && !editResponse)}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-[var(--radius-sm)] shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[36px]"
              >
                {editSuccessMessage ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                    <span>{editSuccessMessage}</span>
                  </>
                ) : editSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
