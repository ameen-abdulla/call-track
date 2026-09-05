'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Bell, Calendar, RotateCcw, Filter, CheckCircle2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { signOut } from 'next-auth/react'

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

interface Freelancer {
  id: string
  name: string
  freelancerStatus: string | null
}

function followUpTypeBadge(type: string | null) {
  if (!type) return null
  const map: Record<string, { label: string; cls: string }> = {
    RETRY_CALL:         { label: 'Retry',      cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    CALLBACK_REQUESTED: { label: 'Callback',   cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    ESCALATION:         { label: 'Escalation', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
    MANUAL:             { label: 'Manual',     cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30' },
  }
  const m = map[type]
  if (!m) return null
  return <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${m.cls}`}>{m.label}</span>
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseLocalDate(str: string): Date {
  const [y, m, day] = str.split('-').map(Number)
  const d = new Date()
  d.setFullYear(y, m - 1, day)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AdminCalendarPage() {
  const today = toDateStr(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [activities, setActivities] = useState<Activity[]>([])
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [loading, setLoading] = useState(true)
  const [freelancerFilter, setFreelancerFilter] = useState('')
  const [contactFilter, setContactFilter] = useState('')
  const [reminding, setReminding] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/freelancers')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setFreelancers(d.filter((f: Freelancer) => f.freelancerStatus === 'APPROVED')) : null)
      .catch(console.error)
  }, [])

  const fetchActivities = useCallback(async (date: string, agentId: string) => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ date })
      if (agentId) q.set('agent_id', agentId)
      const res = await fetch(`/api/activities?${q.toString()}`)
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
    fetchActivities(selectedDate, freelancerFilter)
  }, [selectedDate, freelancerFilter, fetchActivities])

  const changeDate = (days: number) => {
    const d = parseLocalDate(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(toDateStr(d))
  }

  const handleRemind = async (id: string) => {
    setReminding(id)
    try {
      await fetch(`/api/activities/${id}/remind`, { method: 'POST' })
    } finally {
      setReminding(null)
    }
  }

  const isToday = selectedDate === today

  const filtered = activities.filter(a => {
    return !contactFilter || a.contact.name.toLowerCase().includes(contactFilter.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg)] text-[var(--text-secondary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <h1 className="font-bold text-sm text-[var(--text-primary)]">Team Follow-up Calendar</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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

        {/* Date Navigator */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2">
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
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--accent)]"
              title="Jump to today"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-4 space-y-3 pb-20">
        {/* Filters */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-card)] flex flex-wrap gap-2 items-center">
          {/* Freelancer Filter */}
          <select
            value={freelancerFilter}
            onChange={e => setFreelancerFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="">👥 All Freelancers</option>
            {freelancers.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Contact Filter */}
          <div className="relative flex-1 min-w-[160px]">
            <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Filter by contact name..."
              value={contactFilter}
              onChange={e => setContactFilter(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <span className="text-xs text-[var(--text-muted)] font-mono">{filtered.length} activities</span>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading activities...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-10 text-center text-xs text-[var(--text-muted)] space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-[var(--text-primary)] text-sm">No follow-ups scheduled</p>
            <p>No activities found for this day{contactFilter ? ` matching "${contactFilter}"` : ''}.</p>
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
                      <p className="font-bold text-sm text-[var(--text-primary)]">{activity.contact.name}</p>
                      {followUpTypeBadge(activity.followUpType)}
                    </div>
                    <p className="text-xs font-mono text-[var(--text-secondary)]">{activity.contact.phone}</p>
                    <div className="flex items-center gap-2 mt-1 font-mono text-xs font-semibold">
                      <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--accent)]'}>
                        {activity.activityType.toUpperCase()}
                        {' · '}
                        {isOverdue ? `OVERDUE · ${new Date(activity.dueDate).toLocaleDateString()}` : dueTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Caller: {activity.agent.name}</p>
                  </div>

                  <button
                    onClick={() => handleRemind(activity.id)}
                    disabled={reminding === activity.id}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border border-amber-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {reminding === activity.id ? 'Sending...' : 'Remind'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
