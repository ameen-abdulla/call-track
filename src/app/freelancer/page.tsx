'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, AlertTriangle, CheckCircle, Pencil, ArrowRight } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from 'next-auth/react'

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
}

interface Activity {
  id: string
  activityType: string
  dueDate: string
  status: string
  contact: Contact
}

interface DashboardData {
  todaysCalls: Activity[]
  queue: Contact[]
  followUps: Activity[]
  unreadCount: number
}

export default function FreelancerDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'schedule' | 'followups'>('queue')
  const [loading, setLoading] = useState(true)
  const [showEditName, setShowEditName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  async function editName() {
    if (!newName.trim()) return
    setSavingName(true)
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setSavingName(false)
    if (res.ok) {
      setShowEditName(false)
      window.location.reload()
    }
  }

  useEffect(() => {
    let ignore = false
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/agent/dashboard')
        if (res.ok && !ignore) {
          const d = await res.json()
          setData(d)
        }
      } catch (err) {
        console.error('Error fetching caller dashboard:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
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

  const topQueueItem = data?.queue?.[0]

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
              <button
                onClick={() => { setNewName(session?.user?.name || ''); setShowEditName(true) }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)]"
                title="Edit display name"
              >
                <Pencil className="w-3 h-3" />
              </button>
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
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  tab.alert
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : 'bg-[var(--bg)] text-[var(--text-secondary)]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-24">
        {/* Next Lead Banner — Most prominent task-first element */}
        {activeTab === 'queue' && topQueueItem && (
          <div className="bg-[var(--surface)] border-2 border-[var(--accent)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-raised)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                Next Lead in Queue
              </span>
              {topQueueItem.callPriority && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-sm)] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Priority {topQueueItem.callPriority}
                </span>
              )}
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

        {/* Lead Queue List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading queue...</div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <div className="space-y-2">
                {data?.queue?.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                    <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                    <p className="font-semibold text-[var(--text-primary)] text-sm">All Assigned Leads Contacted</p>
                    <p>Check with admin for new allocations.</p>
                  </div>
                ) : (
                  data?.queue?.map(contact => (
                    <div
                      key={contact.id}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{contact.name}</p>
                          {contact.callPriority && (
                            <span className="text-[9px] font-mono font-bold text-blue-600">P{contact.callPriority}</span>
                          )}
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

            {activeTab === 'schedule' && (
              <div className="space-y-2">
                {data?.todaysCalls?.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)]">
                    No calls scheduled for today
                  </div>
                ) : (
                  data?.todaysCalls?.map(activity => (
                    <div key={activity.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-xs text-[var(--text-primary)]">{activity.contact.name}</p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">{activity.contact.phone}</p>
                        <p className="text-[11px] text-[var(--accent)] font-mono mt-1">
                          {activity.activityType.toUpperCase()} — {new Date(activity.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            {activeTab === 'followups' && (
              <div className="space-y-2">
                {data?.followUps?.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center text-xs text-[var(--text-muted)]">
                    No overdue follow-ups
                  </div>
                ) : (
                  data?.followUps?.map(activity => (
                    <div key={activity.id} className="bg-[var(--surface)] border border-red-500/30 rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-card)] flex items-start justify-between gap-2">
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
          </>
        )}
      </div>

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-xs p-4 shadow-[var(--shadow-modal)] space-y-3">
            <h3 className="font-bold text-xs text-[var(--text-primary)]">Edit Display Name</h3>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)]"
              placeholder="Your name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditName(false)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editName}
                disabled={savingName || !newName.trim()}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold"
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
