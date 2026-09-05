'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Phone, ArrowLeft, ArrowRight, CheckCircle2, Calendar, RotateCcw, Filter } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'

interface Activity {
  id: string
  activityType: string
  followUpType: string | null
  dueDate: string
  status: string
  contactId: string
  contact: { id: string; name: string; phone: string }
  agent: { name: string }
}

function followUpTypeBadge(type: string | null) {
  if (!type) return null
  const map: Record<string, { label: string; cls: string }> = {
    RETRY_CALL:          { label: 'Retry',     cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    CALLBACK_REQUESTED:  { label: 'Callback',  cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    ESCALATION:          { label: 'Escalation',cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
    MANUAL:              { label: 'Manual',    cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30' },
  }
  const m = map[type]
  if (!m) return null
  return <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${m.cls}`}>{m.label}</span>
}

function toDateStr(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(str: string): Date {
  const [y, m, day] = str.split('-').map(Number)
  return new Date(y, m - 1, day, 12, 0, 0)
}

function CalendarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialDate = searchParams.get('date') || toDateStr(new Date())
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('pending')
  const [contactFilter, setContactFilter] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchActivities = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/activities?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error fetching calendar activities:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities(selectedDate)
  }, [selectedDate, fetchActivities])

  const changeDate = (days: number) => {
    const d = parseLocalDate(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(toDateStr(d))
  }

  const handleComplete = async (id: string) => {
    setCompleting(id)
    try {
      await fetch(`/api/activities/${id}/complete`, { method: 'PUT' })
      setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a))
    } finally {
      setCompleting(null)
    }
  }

  const today = toDateStr(new Date())
  const isToday = selectedDate === today

  const filtered = activities.filter(a => {
    const matchesStatus = statusFilter === 'pending'
      ? a.status === 'pending' || a.status === 'overdue'
      : a.status === 'completed'
    const matchesContact = !contactFilter || (a.contact?.name?.toLowerCase().includes(contactFilter.toLowerCase()) ?? false)
    return matchesStatus && matchesContact
  })

  const pendingCount = activities.filter(a => a.status === 'pending' || a.status === 'overdue').length
  const completedCount = activities.filter(a => a.status === 'completed').length

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/freelancer')}
              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg)] text-[var(--text-secondary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <h1 className="font-bold text-sm text-[var(--text-primary)]">Follow-up Calendar</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        {/* Date Navigator */}
        <div className="max-w-md mx-auto px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {isToday ? 'Today' : parseLocalDate(selectedDate).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-[10px] font-mono text-[var(--text-muted)] bg-transparent border-none outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--accent)] text-[10px] font-semibold"
              title="Jump to today"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-24">
        {/* Filters */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-card)] space-y-2">
          {/* Status Toggle */}
          <div className="flex bg-[var(--bg)] p-0.5 rounded-[var(--radius-sm)] border border-[var(--border)]">
            {([
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'completed', label: `Completed (${completedCount})` },
            ] as { key: 'pending' | 'completed'; label: string }[]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`flex-1 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                  statusFilter === opt.key
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Contact Filter */}
          <div className="relative">
            <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Filter by contact name..."
              value={contactFilter}
              onChange={e => setContactFilter(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading activities...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-10 text-center text-xs text-[var(--text-muted)] space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-[var(--text-primary)] text-sm">
              {statusFilter === 'pending' ? 'No pending follow-ups' : 'No completed activities'}
            </p>
            <p>
              {statusFilter === 'pending'
                ? 'All clear for this day.'
                : 'No activities were completed on this day.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(activity => {
              const isOverdue = activity.status === 'overdue'
              const dueTime = new Date(activity.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <div
                  key={activity.id}
                  className={`bg-[var(--surface)] border rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-3 ${
                    isOverdue ? 'border-red-500/30' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-xs text-[var(--text-primary)]">{activity.contact?.name || 'Unnamed Contact'}</p>
                      {followUpTypeBadge(activity.followUpType)}
                    </div>
                    {activity.contact?.phone && (
                      <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{activity.contact.phone}</p>
                    )}
                    <p className={`text-[11px] font-mono font-semibold mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--accent)]'}`}>
                      {activity.activityType.toUpperCase()} · {isOverdue ? `OVERDUE · ${new Date(activity.dueDate).toLocaleDateString()}` : dueTime}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {activity.contact?.id && (
                      <Link
                        href={`/freelancer/call/${activity.contact.id}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </Link>
                    )}
                    {activity.status !== 'completed' && (
                      <button
                        onClick={() => handleComplete(activity.id)}
                        disabled={completing === activity.id}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                      >
                        {completing === activity.id ? '...' : 'Mark Done ✓'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

export default function FreelancerCalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs text-[var(--text-muted)]">Loading...</div>}>
      <CalendarInner />
    </Suspense>
  )
}
