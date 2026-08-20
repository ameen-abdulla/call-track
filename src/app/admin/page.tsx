'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Users, Phone, TrendingUp, AlertCircle, Upload, UserPlus, Bell, Pencil } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'

// --- Types ---
interface KPIs {
  totalContacts: number
  callsToday: number
  conversionRate: number
  overdueFollowUps: number
  pendingFreelancers?: number
}

interface Tag {
  id: string
  name: string
}

interface Contact {
  id: string
  name: string
  phone: string
  phone2: string | null
  email: string | null
  company: string | null
  source: string | null
  status: string
  topic: string | null
  callPriority?: string | null
  tags?: { tag: { id: string; name: string } }[]
  assignedTo?: { id: string; name: string } | null
  assignedAgent?: { id: string; name: string } | null
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
  new: 'bg-gray-800 text-gray-300 border border-gray-700',
  queued: 'bg-blue-950 text-blue-300 border border-blue-800',
  contacted: 'bg-yellow-950 text-yellow-300 border border-yellow-800',
  follow_up: 'bg-orange-950 text-orange-300 border border-orange-800',
  converted: 'bg-green-950 text-green-300 border border-green-800',
  lost: 'bg-red-950 text-red-300 border border-red-800',
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'contacts' | 'overdue' | 'performance'>('contacts')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [pendingFreelancers, setPendingFreelancers] = useState<number>(0)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [overdueList, setOverdueList] = useState<OverdueActivity[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAssign, setShowAssign] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState<Contact | null>(null)
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string } | null>(null)
  const [editAgentName, setEditAgentName] = useState('')
  const [savingAgentName, setSavingAgentName] = useState(false)

  // Add contact form
  const [newContact, setNewContact] = useState({ name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '' })
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
        const queryParams = new URLSearchParams()
        if (search) queryParams.set('search', search)
        if (filterStatus) queryParams.set('status', filterStatus)
        if (filterPriority) queryParams.set('callPriority', filterPriority)
        if (filterTag) queryParams.set('tagId', filterTag)

        const [dashRes, contactsRes, agentsRes, tagsRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch(`/api/contacts?${queryParams.toString()}`),
          fetch('/api/users?role=agent'),
          fetch('/api/admin/tags'),
        ])
        const [dash, contactsData, agentsData, tagsData] = await Promise.all([
          dashRes.json(),
          contactsRes.json(),
          agentsRes.json(),
          tagsRes.json(),
        ])
        if (!ignore) {
          if (dash) {
            if (dash.kpis) setKpis(dash.kpis)
            if (dash.overdueList) setOverdueList(dash.overdueList || [])
            setPendingFreelancers(dash.pendingFreelancers ?? dash.kpis?.pendingFreelancers ?? 0)
          }
          if (Array.isArray(agentsData)) setAgents(agentsData)
          if (Array.isArray(contactsData)) setContacts(contactsData)
          if (Array.isArray(tagsData)) setTags(tagsData)
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
  }, [search, filterStatus, filterPriority, filterTag, refreshKey])

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
    setNewContact({ name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '' })
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

  async function handleUpdateAgentName() {
    if (!editingAgent || !editAgentName.trim()) return
    setSavingAgentName(true)
    const res = await fetch(`/api/users/${editingAgent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editAgentName.trim() }),
    })
    setSavingAgentName(false)
    if (res.ok) {
      setEditingAgent(null)
      setEditAgentName('')
      refreshAll()
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">{session?.user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-500 hover:text-gray-400 px-2 py-1 min-h-[44px]">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* KPI Strip */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Contacts', value: kpis.totalContacts, icon: Users, color: 'text-blue-400' },
              { label: 'Calls Today', value: kpis.callsToday, icon: Phone, color: 'text-green-400' },
              { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, icon: TrendingUp, color: 'text-purple-400' },
              { label: 'Overdue Follow-ups', value: kpis.overdueFollowUps, icon: AlertCircle, color: 'text-red-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
                <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 bg-gray-900 rounded-2xl border border-gray-800 shadow-sm mb-4 overflow-hidden">
          {[
            { key: 'contacts', label: 'Contacts' },
            { key: 'overdue', label: `Overdue (${overdueList.length})` },
            { key: 'performance', label: 'Performance' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-3 text-sm font-medium min-h-[44px] border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-500 text-blue-400 bg-blue-950' : 'border-transparent text-gray-500 hover:text-gray-300'
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
                className="flex-1 min-w-40 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[44px] focus:outline-none"
              >
                <option value="">All Status</option>
                {['new','queued','contacted','follow_up','converted','lost'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Add
              </button>
              <label className="flex items-center gap-1 bg-gray-800 text-gray-300 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700">
                <Upload className="w-4 h-4" /> CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : contacts.map(contact => (
                <div key={contact.id} className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowContactDetail(contact)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{contact.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[contact.status] || 'bg-gray-800 text-gray-300'}`}>
                          {contact.status.replace('_', ' ')}
                        </span>
                      </div>
                      {contact.company && <p className="text-xs text-gray-400">{contact.company}</p>}
                      <p className="text-sm text-gray-400 mt-0.5">{contact.phone}</p>
                      {contact.phone2 && (
                        <p className="text-xs text-gray-500">📱 {contact.phone2}</p>
                      )}
                      {contact.topic && (
                        <p className="text-xs text-blue-400 mt-1 line-clamp-1">📋 {contact.topic}</p>
                      )}
                      {contact.assignedAgent && (
                        <p className="text-xs text-gray-500 mt-0.5">Assigned to: {contact.assignedAgent.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowAssign(contact); setAssignTopic(contact.topic || '') }}
                      className="flex-shrink-0 bg-indigo-950 text-indigo-300 hover:bg-indigo-900 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors border border-indigo-800"
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
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                <p>No overdue follow-ups</p>
              </div>
            ) : overdueList.map(activity => (
              <div key={activity.id} className="bg-gray-900 rounded-xl p-4 shadow-sm border border-red-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{activity.contact.name}</p>
                    <p className="text-sm text-gray-400">{activity.contact.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.activityType} — due {new Date(activity.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">Agent: {activity.agent.name}</p>
                  </div>
                  <button
                    onClick={() => handleRemind(activity.id)}
                    className="flex items-center gap-1 bg-orange-950 text-orange-300 hover:bg-orange-900 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors border border-orange-800"
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
            <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
              <h2 className="font-semibold text-white mb-3">Team Performance</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-950 border border-green-900 rounded-xl p-3">
                  <p className="text-xs text-green-300">Calls Today</p>
                  <p className="text-2xl font-bold text-green-400">{kpis?.callsToday ?? 0}</p>
                </div>
                <div className="bg-blue-950 border border-blue-900 rounded-xl p-3">
                  <p className="text-xs text-blue-300">Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-400">{kpis?.conversionRate ?? 0}%</p>
                </div>
                <div className="bg-purple-950 border border-purple-900 rounded-xl p-3">
                  <p className="text-xs text-purple-300">Total Contacts</p>
                  <p className="text-2xl font-bold text-purple-400">{kpis?.totalContacts ?? 0}</p>
                </div>
                <div className="bg-red-950 border border-red-900 rounded-xl p-3">
                  <p className="text-xs text-red-300">Overdue</p>
                  <p className="text-2xl font-bold text-red-400">{kpis?.overdueFollowUps ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
              <h2 className="font-semibold text-white mb-3">Secretaries</h2>
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{agent.name}</p>
                    <button
                      onClick={() => {
                        setEditingAgent(agent)
                        setEditAgentName(agent.name)
                      }}
                      className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                      title="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Add Contact</h2>
              <button onClick={() => setShowAddContact(false)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text', placeholder: 'Full name' },
                { key: 'phone', label: 'Phone *', type: 'tel', placeholder: '+971...' },
                { key: 'phone2', label: 'Mobile / WhatsApp (optional)', type: 'tel', placeholder: '+974...' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'optional' },
                { key: 'company', label: 'Company', type: 'text', placeholder: 'optional' },
                { key: 'source', label: 'Source', type: 'text', placeholder: 'website / referral / campaign' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-gray-300">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={newContact[field.key as keyof typeof newContact]}
                    onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-300">Topic to discuss</label>
                <textarea
                  placeholder="What should the secretary discuss on this call?"
                  value={newContact.topic}
                  onChange={e => setNewContact(p => ({ ...p, topic: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name || !newContact.phone || addingContact}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addingContact ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Assign {showAssign.name}</h2>
              <button onClick={() => setShowAssign(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Assign to Secretary</label>
                <select
                  value={assignAgentId}
                  onChange={e => setAssignAgentId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[44px] focus:outline-none"
                >
                  <option value="">Select secretary...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Topic to discuss *</label>
                <textarea
                  placeholder="What should the secretary discuss on this call?"
                  value={assignTopic}
                  onChange={e => setAssignTopic(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleAssign}
                disabled={!assignAgentId || assigning}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showContactDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">{showContactDetail.name}</h2>
              <button onClick={() => setShowContactDetail(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <ContactDetail contact={showContactDetail} />
          </div>
        </div>
      )}

      {/* Edit Secretary Name Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Edit Secretary Name</h2>
              <button onClick={() => setEditingAgent(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Secretary Name</label>
                <input
                  type="text"
                  value={editAgentName}
                  onChange={e => setEditAgentName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name"
                  autoFocus
                />
              </div>
              <button
                onClick={handleUpdateAgentName}
                disabled={!editAgentName.trim() || savingAgentName}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingAgentName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
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
        <div><span className="text-gray-400">Phone</span><p className="font-medium text-white">{contact.phone}</p></div>
        {contact.phone2 && (
          <div><span className="text-gray-400">Mobile / WhatsApp</span><p className="font-medium text-white">{contact.phone2}</p></div>
        )}
        <div><span className="text-gray-400">Company</span><p className="font-medium text-white">{contact.company || '—'}</p></div>
        <div><span className="text-gray-400">Email</span><p className="font-medium text-white">{contact.email || '—'}</p></div>
        <div><span className="text-gray-400">Source</span><p className="font-medium text-white">{contact.source || '—'}</p></div>
        <div className="col-span-2"><span className="text-gray-400">Status</span><p className="font-medium text-white capitalize">{contact.status.replace('_', ' ')}</p></div>
        {contact.topic && (
          <div className="col-span-2">
            <span className="text-gray-400">Topic</span>
            <p className="font-medium text-blue-300">{contact.topic}</p>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-white mb-2">Call History</h3>
        {calls.length === 0 ? (
          <p className="text-sm text-gray-500">No calls recorded yet</p>
        ) : (
          <div className="space-y-2">
            {calls.map(call => (
              <div key={call.id} className="bg-gray-800 rounded-xl p-3 text-sm border border-gray-700/50">
                <div className="flex justify-between">
                  <span className="font-medium text-white capitalize">{call.outcome.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                </div>
                {call.interestLevel && <p className="text-xs text-orange-400 mt-0.5 capitalize">{call.interestLevel} interest</p>}
                {call.feedbackNotes && <p className="text-xs text-gray-300 mt-1">{call.feedbackNotes}</p>}
                <p className="text-xs text-gray-500 mt-0.5">by {call.agent.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
