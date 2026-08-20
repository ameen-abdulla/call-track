'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Users, Phone, TrendingUp, AlertCircle, Upload, UserPlus, Bell } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'

// --- Types ---
interface KPIs {
  totalContacts: number
  callsToday: number
  conversionRate: number
  overdueFollowUps: number
}

interface Contact {
  id: string
  name: string
  phone: string
  email: string | null
  company: string | null
  source: string | null
  status: string
  topic: string | null
  assignedAgent: { id: string; name: string } | null
}

interface OverdueActivity {
  id: string
  activityType: string
  dueDate: string
  contact: { name: string; phone: string }
  agent: { name: string }
}

interface Agent {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  queued: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  follow_up: 'bg-orange-100 text-orange-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'contacts' | 'overdue' | 'performance'>('contacts')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [overdueList, setOverdueList] = useState<OverdueActivity[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAssign, setShowAssign] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState<Contact | null>(null)

  // Add contact form
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', company: '', source: '', topic: '' })
  const [addingContact, setAddingContact] = useState(false)

  // Assign form
  const [assignAgentId, setAssignAgentId] = useState('')
  const [assignTopic, setAssignTopic] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        const [dashRes, contactsRes, agentsRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch(`/api/contacts?search=${encodeURIComponent(search)}&${filterStatus ? `status=${filterStatus}` : ''}`),
          fetch('/api/users?role=agent'),
        ])
        const [dash, contactsData, agentsData] = await Promise.all([
          dashRes.json(),
          contactsRes.json(),
          agentsRes.json(),
        ])
        if (!ignore) {
          if (dash && dash.kpis) {
            setKpis(dash.kpis)
            setOverdueList(dash.overdueList || [])
          }
          if (Array.isArray(agentsData)) setAgents(agentsData)
          if (Array.isArray(contactsData)) setContacts(contactsData)
        }
      } catch (e) {
        console.error('Error fetching admin data:', e)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [search, filterStatus, refreshKey])

  const refreshAll = () => setRefreshKey(k => k + 1)

  async function handleAddContact() {
    setAddingContact(true)
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContact),
    })
    setAddingContact(false)
    setShowAddContact(false)
    setNewContact({ name: '', phone: '', email: '', company: '', source: '', topic: '' })
    refreshAll()
  }

  async function handleAssign() {
    if (!showAssign || !assignAgentId) return
    setAssigning(true)
    await fetch(`/api/contacts/${showAssign.id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: assignAgentId, topic: assignTopic }),
    })
    setAssigning(false)
    setShowAssign(null)
    setAssignAgentId('')
    setAssignTopic('')
    refreshAll()
  }

  async function handleRemind(activityId: string) {
    await fetch(`/api/activities/${activityId}/remind`, { method: 'POST' })
    alert('Reminder sent!')
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/contacts/import', { method: 'POST', body: formData })
    const data = await res.json()
    alert(`Imported ${data.imported} contacts`)
    refreshAll()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">{session?.user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-400 px-2 py-1 min-h-[44px]">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* KPI Strip */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Contacts', value: kpis.totalContacts, icon: Users, color: 'text-blue-600' },
              { label: 'Calls Today', value: kpis.callsToday, icon: Phone, color: 'text-green-600' },
              { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, icon: TrendingUp, color: 'text-purple-600' },
              { label: 'Overdue Follow-ups', value: kpis.overdueFollowUps, icon: AlertCircle, color: 'text-red-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm border">
                <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden">
          {[
            { key: 'contacts', label: 'Contacts' },
            { key: 'overdue', label: `Overdue (${overdueList.length})` },
            { key: 'performance', label: 'Performance' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-3 text-sm font-medium min-h-[44px] border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <input
                type="search"
                placeholder="Search contacts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-40 px-3 py-2 rounded-xl border text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border text-sm min-h-[44px] focus:outline-none"
              >
                <option value="">All Status</option>
                {['new','queued','contacted','follow_up','converted','lost'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" /> Add
              </button>
              <label className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] cursor-pointer hover:bg-gray-200">
                <Upload className="w-4 h-4" /> CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : contacts.map(contact => (
                <div key={contact.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowContactDetail(contact)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[contact.status] || 'bg-gray-100 text-gray-600'}`}>
                          {contact.status.replace('_', ' ')}
                        </span>
                      </div>
                      {contact.company && <p className="text-xs text-gray-400">{contact.company}</p>}
                      <p className="text-sm text-gray-600 mt-0.5">{contact.phone}</p>
                      {contact.topic && (
                        <p className="text-xs text-blue-600 mt-1 line-clamp-1">📋 {contact.topic}</p>
                      )}
                      {contact.assignedAgent && (
                        <p className="text-xs text-gray-400 mt-0.5">Assigned to: {contact.assignedAgent.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowAssign(contact); setAssignTopic(contact.topic || '') }}
                      className="flex-shrink-0 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] hover:bg-indigo-100"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Tab */}
        {tab === 'overdue' && (
          <div className="space-y-3">
            {overdueList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No overdue follow-ups</p>
              </div>
            ) : overdueList.map(activity => (
              <div key={activity.id} className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{activity.contact.name}</p>
                    <p className="text-sm text-gray-500">{activity.contact.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.activityType} — due {new Date(activity.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">Agent: {activity.agent.name}</p>
                  </div>
                  <button
                    onClick={() => handleRemind(activity.id)}
                    className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] hover:bg-orange-100"
                  >
                    <Bell className="w-3.5 h-3.5" /> Remind
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Tab */}
        {tab === 'performance' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <h2 className="font-semibold mb-3">Team Performance</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Calls Today</p>
                  <p className="text-2xl font-bold text-green-700">{kpis?.callsToday ?? 0}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-700">{kpis?.conversionRate ?? 0}%</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total Contacts</p>
                  <p className="text-2xl font-bold text-purple-700">{kpis?.totalContacts ?? 0}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-700">{kpis?.overdueFollowUps ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <h2 className="font-semibold mb-3">Secretaries</h2>
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold">Add Contact</h2>
              <button onClick={() => setShowAddContact(false)} className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text', placeholder: 'Full name' },
                { key: 'phone', label: 'Phone *', type: 'tel', placeholder: '+971...' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'optional' },
                { key: 'company', label: 'Company', type: 'text', placeholder: 'optional' },
                { key: 'source', label: 'Source', type: 'text', placeholder: 'website / referral / campaign' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={newContact[field.key as keyof typeof newContact]}
                    onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl border text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-700">Topic to discuss</label>
                <textarea
                  placeholder="What should the secretary discuss on this call?"
                  value={newContact.topic}
                  onChange={e => setNewContact(p => ({ ...p, topic: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name || !newContact.phone || addingContact}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
              >
                {addingContact ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold">Assign {showAssign.name}</h2>
              <button onClick={() => setShowAssign(null)} className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Assign to Secretary</label>
                <select
                  value={assignAgentId}
                  onChange={e => setAssignAgentId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm min-h-[44px] focus:outline-none"
                >
                  <option value="">Select secretary...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Topic to discuss *</label>
                <textarea
                  placeholder="What should the secretary discuss on this call?"
                  value={assignTopic}
                  onChange={e => setAssignTopic(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleAssign}
                disabled={!assignAgentId || assigning}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showContactDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold">{showContactDetail.name}</h2>
              <button onClick={() => setShowContactDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px]">✕</button>
            </div>
            <ContactDetail contact={showContactDetail} />
          </div>
        </div>
      )}
    </main>
  )
}

function ContactDetail({ contact }: { contact: Contact }) {
  const [calls, setCalls] = useState<Array<{
    id: string; callTime: string; outcome: string;
    interestLevel: string | null; feedbackNotes: string | null; agent: { name: string }
  }>>([])
  
  useEffect(() => {
    let ignore = false
    async function loadCalls() {
      try {
        const res = await fetch(`/api/contacts/${contact.id}/calls`)
        if (res.ok && !ignore) {
          const data = await res.json()
          if (Array.isArray(data)) setCalls(data)
        }
      } catch {
        // ignore
      }
    }
    loadCalls()
    return () => {
      ignore = true
    }
  }, [contact.id])

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-400">Phone</span><p className="font-medium">{contact.phone}</p></div>
        <div><span className="text-gray-400">Company</span><p className="font-medium">{contact.company || '—'}</p></div>
        <div><span className="text-gray-400">Email</span><p className="font-medium">{contact.email || '—'}</p></div>
        <div><span className="text-gray-400">Source</span><p className="font-medium">{contact.source || '—'}</p></div>
        <div className="col-span-2"><span className="text-gray-400">Status</span><p className="font-medium capitalize">{contact.status.replace('_', ' ')}</p></div>
        {contact.topic && (
          <div className="col-span-2">
            <span className="text-gray-400">Topic</span>
            <p className="font-medium text-blue-700">{contact.topic}</p>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-semibold text-sm mb-2">Call History</h3>
        {calls.length === 0 ? (
          <p className="text-sm text-gray-400">No calls recorded yet</p>
        ) : (
          <div className="space-y-2">
            {calls.map(call => (
              <div key={call.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium capitalize">{call.outcome.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                </div>
                {call.interestLevel && <p className="text-xs text-orange-600 mt-0.5 capitalize">{call.interestLevel} interest</p>}
                {call.feedbackNotes && <p className="text-xs text-gray-500 mt-1">{call.feedbackNotes}</p>}
                <p className="text-xs text-gray-400 mt-0.5">by {call.agent.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
