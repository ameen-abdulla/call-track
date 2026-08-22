'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Users, Phone, TrendingUp, AlertCircle, Upload, UserPlus, Bell,
  Pencil, Search, Filter, CheckCircle2, UserCheck, UserX, Tag as TagIcon, Sparkles
} from 'lucide-react'
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
  assignedTo?: { id: string; name: string; email?: string } | null
  _count?: { calls: number }
}

interface OverdueActivity {
  id: string
  activityType: string
  dueDate: string
  contact: { name: string; phone: string }
  agent: { name: string }
}

interface Freelancer {
  id: string
  name: string
  email: string
  phone?: string | null
  freelancerStatus: string | null
  _count?: { assignedContacts: number; calls: number }
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
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [filterAssignment, setFilterAssignment] = useState('all') // 'all' | 'unassigned' | 'assigned' | freelancerId
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddFreelancer, setShowAddFreelancer] = useState(false)
  const [showAssign, setShowAssign] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState<Contact | null>(null)
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string } | null>(null)
  const [editAgentName, setEditAgentName] = useState('')
  const [savingAgentName, setSavingAgentName] = useState(false)

  // Add contact form
  const [newContact, setNewContact] = useState({
    name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '', callPriority: '', assignedToId: '', tagIds: [] as string[]
  })
  const [addingContact, setAddingContact] = useState(false)

  // Add freelancer form
  const [newFreelancer, setNewFreelancer] = useState({ name: '', email: '', phone: '', password: '', applicationNote: '' })
  const [creatingFreelancer, setCreatingFreelancer] = useState(false)
  const [createFreelancerError, setCreateFreelancerError] = useState('')

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
        if (filterAssignment && filterAssignment !== 'all') {
          queryParams.set('assignment', filterAssignment)
        }
        if (filterStatus) queryParams.set('status', filterStatus)
        if (filterPriority) queryParams.set('callPriority', filterPriority)
        if (filterTag) queryParams.set('tagId', filterTag)

        const [dashRes, contactsRes, freelancersRes, tagsRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch(`/api/contacts?${queryParams.toString()}`),
          fetch('/api/admin/freelancers'),
          fetch('/api/admin/tags'),
        ])
        const [dash, contactsData, freelancersData, tagsData] = await Promise.all([
          dashRes.json(),
          contactsRes.json(),
          freelancersRes.json(),
          tagsRes.json(),
        ])
        if (!ignore) {
          if (dash) {
            if (dash.kpis) setKpis(dash.kpis)
            if (dash.overdueList) setOverdueList(dash.overdueList || [])
            setPendingFreelancers(dash.pendingFreelancers ?? dash.kpis?.pendingFreelancers ?? 0)
          }
          if (Array.isArray(freelancersData)) setFreelancers(freelancersData)
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
  }, [search, filterAssignment, filterStatus, filterPriority, filterTag, refreshKey])

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
    setNewContact({ name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '', callPriority: '', assignedToId: '', tagIds: [] })
    refreshAll()
  }

  async function handleCreateFreelancer(e: React.FormEvent) {
    e.preventDefault()
    setCreatingFreelancer(true)
    setCreateFreelancerError('')
    try {
      const res = await fetch('/api/admin/freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFreelancer),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateFreelancerError(data.error || 'Failed to create freelancer')
      } else {
        setShowAddFreelancer(false)
        setNewFreelancer({ name: '', email: '', phone: '', password: '', applicationNote: '' })
        refreshAll()
      }
    } catch {
      setCreateFreelancerError('Error connecting to server.')
    } finally {
      setCreatingFreelancer(false)
    }
  }

  async function handleAssign() {
    if (!showAssign) return
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
    alert('Reminder sent to freelancer!')
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/contacts/import', { method: 'POST', body: formData })
    const data = await res.json()
    alert(`Imported ${data.imported} contacts successfully!`)
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

  const approvedFreelancers = freelancers.filter(f => f.freelancerStatus === 'APPROVED' || !f.freelancerStatus)
  const assignedCount = contacts.filter(c => c.assignedTo).length
  const unassignedCount = contacts.filter(c => !c.assignedTo).length

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-white text-lg">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">{session?.user?.name || 'Administrator'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/freelancers"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white transition-colors border border-gray-700 min-h-[36px]"
            >
              Freelancers ({freelancers.length})
              {pendingFreelancers > 0 && (
                <span className="bg-yellow-950 text-yellow-400 border border-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingFreelancers} Pending
                </span>
              )}
            </Link>
            <Link
              href="/admin/tags"
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white transition-colors border border-gray-700 min-h-[36px] flex items-center"
            >
              Tags ({tags.length})
            </Link>
            <Link
              href="/admin/contacts/unassigned"
              className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors border border-amber-800/80 min-h-[36px] flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              Unassigned Pool
            </Link>
            <NotificationBell />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-500 hover:text-gray-400 px-2 py-1 min-h-[44px]">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* KPI Strip */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        {/* Main Navigation Tabs */}
        <div className="flex gap-0 bg-gray-900 rounded-2xl border border-gray-800 shadow-sm overflow-hidden">
          {[
            { key: 'contacts', label: 'All Contacts & Assignment' },
            { key: 'overdue', label: `Overdue Follow-ups (${overdueList.length})` },
            { key: 'performance', label: 'Team & Freelancers' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-3 text-sm font-medium min-h-[44px] border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-500 text-blue-400 bg-blue-950/40' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ===================== CONTACTS TAB ===================== */}
        {tab === 'contacts' && (
          <div className="space-y-3">
            {/* Quick 1-Click Segmented Toggle (All / Unassigned / Assigned) */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-900 border border-gray-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setFilterAssignment('all')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950 ring-1 ring-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>📋 All Contacts</span>
                <span className="bg-black/30 px-2 py-0.5 rounded-full text-[11px]">{contacts.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterAssignment('unassigned')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'unassigned'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950 ring-1 ring-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-300" />
                  Unassigned Pool
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${filterAssignment === 'unassigned' ? 'bg-black/30' : unassignedCount > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-gray-800'}`}>
                  {unassignedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterAssignment('assigned')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'assigned'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-green-300" />
                  Assigned Leads
                </span>
                <span className="bg-black/30 px-2 py-0.5 rounded-full text-[11px] font-bold">{assignedCount}</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 space-y-3">
              <div className="flex gap-2 flex-wrap items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    placeholder="Search by name, phone, company, freelancer, tag..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Specific Freelancer Filter */}
                <select
                  value={filterAssignment.startsWith('all') || filterAssignment === 'assigned' || filterAssignment === 'unassigned' ? '' : filterAssignment}
                  onChange={e => setFilterAssignment(e.target.value || 'all')}
                  className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">👤 Filter by Specific Freelancer</option>
                  {approvedFreelancers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f._count?.assignedContacts ?? 0})</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[42px] focus:outline-none"
                >
                  <option value="">Status: All</option>
                  {['new', 'queued', 'contacted', 'follow_up', 'converted', 'lost'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[42px] focus:outline-none"
                >
                  <option value="">Priority: All</option>
                  <option value="A">Priority A</option>
                  <option value="B">Priority B</option>
                </select>

                {/* Tag Filter */}
                <select
                  value={filterTag}
                  onChange={e => setFilterTag(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[42px] focus:outline-none"
                >
                  <option value="">Tag: All</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Actions */}
                <button
                  onClick={() => setShowAddContact(true)}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-xl text-sm font-medium min-h-[42px] hover:bg-blue-700 transition-colors shrink-0"
                >
                  <UserPlus className="w-4 h-4" /> Add Contact
                </button>
                <label className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-3.5 py-2 rounded-xl text-sm font-medium min-h-[42px] cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700 shrink-0">
                  <Upload className="w-4 h-4" /> Import CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                </label>
              </div>

              {/* Active Filter Indicators */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-800/80 text-xs text-gray-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <span>Showing <strong>{contacts.length}</strong> contacts</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-green-400"><strong>{assignedCount}</strong> Assigned</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-amber-400"><strong>{unassignedCount}</strong> Unassigned</span>
                </div>

                {(search || filterAssignment !== 'all' || filterStatus || filterPriority || filterTag) && (
                  <button
                    onClick={() => { setSearch(''); setFilterAssignment('all'); setFilterStatus(''); setFilterPriority(''); setFilterTag('') }}
                    className="text-blue-400 hover:underline text-xs"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Listing */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400 space-y-2">
                  <p className="text-2xl">🔍</p>
                  <p className="font-semibold text-white">No contacts found for current filter</p>
                  <p className="text-xs text-gray-500">Try switching between Unassigned / Assigned or clearing the search</p>
                  <button
                    onClick={() => { setSearch(''); setFilterAssignment('all'); setFilterStatus(''); setFilterPriority(''); setFilterTag('') }}
                    className="mt-2 text-xs text-blue-400 hover:underline"
                  >
                    Show all contacts
                  </button>
                </div>
              ) : (
                contacts.map(contact => {
                  const assigned = contact.assignedTo
                  return (
                    <div
                      key={contact.id}
                      className={`bg-gray-900 rounded-xl p-4 shadow-sm border transition-all ${
                        !assigned
                          ? 'border-amber-900/40 hover:border-amber-700/60'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Main Contact Info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setShowContactDetail(contact)}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-white hover:text-blue-400 transition-colors">{contact.name}</p>
                            
                            {/* Status badge */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[contact.status] || 'bg-gray-800 text-gray-300'}`}>
                              {contact.status.replace('_', ' ')}
                            </span>

                            {/* Priority badge */}
                            {contact.callPriority && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-950 text-blue-400 border border-blue-800">
                                Priority {contact.callPriority}
                              </span>
                            )}

                            {/* Assignment Badge */}
                            {assigned ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                Assigned: {assigned.name}
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                                <UserX className="w-3.5 h-3.5 text-amber-400" />
                                UNASSIGNED
                              </span>
                            )}
                          </div>

                          {contact.company && <p className="text-xs text-gray-400">{contact.company}</p>}
                          
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                            <span>📞 {contact.phone}</span>
                            {contact.phone2 && <span>📱 {contact.phone2}</span>}
                            {contact.email && <span>✉️ {contact.email}</span>}
                            {contact._count?.calls !== undefined && (
                              <span className="text-gray-500">({contact._count.calls} calls)</span>
                            )}
                          </div>

                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {contact.tags.map(t => (
                                <span key={t.tag.id} className="text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700/60">
                                  {t.tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {contact.topic && (
                            <p className="text-xs text-blue-300 mt-1.5 line-clamp-1 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-900/40">
                              📋 Topic: {contact.topic}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setShowAssign(contact)
                              setAssignAgentId(contact.assignedTo?.id || '')
                              setAssignTopic(contact.topic || '')
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[38px] transition-colors border ${
                              assigned
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'
                                : 'bg-green-600 text-white hover:bg-green-700 border-green-600 shadow-md shadow-green-950'
                            }`}
                          >
                            {assigned ? 'Reassign' : 'Assign Freelancer'}
                          </button>

                          <button
                            onClick={() => setShowContactDetail(contact)}
                            className="text-xs text-gray-400 hover:text-white px-2 py-1"
                          >
                            Full Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ===================== OVERDUE TAB ===================== */}
        {tab === 'overdue' && (
          <div className="space-y-3">
            {overdueList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                <p className="text-white font-medium">No overdue follow-ups</p>
                <p className="text-xs text-gray-500 mt-1">All freelancer activities are on schedule.</p>
              </div>
            ) : overdueList.map(activity => (
              <div key={activity.id} className="bg-gray-900 rounded-xl p-4 shadow-sm border border-red-900/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{activity.contact.name}</p>
                    <p className="text-sm text-gray-400">{activity.contact.phone}</p>
                    <p className="text-xs text-red-300 mt-1">
                      {activity.activityType} — due {new Date(activity.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Assigned to: {activity.agent.name}</p>
                  </div>
                  <button
                    onClick={() => handleRemind(activity.id)}
                    className="flex items-center gap-1 bg-orange-950 text-orange-300 hover:bg-orange-900 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors border border-orange-800"
                  >
                    <Bell className="w-3.5 h-3.5" /> Send Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===================== PERFORMANCE TAB ===================== */}
        {tab === 'performance' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
              <h2 className="font-semibold text-white mb-3">Team Performance Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  <p className="text-xs text-red-300">Overdue Follow-ups</p>
                  <p className="text-2xl font-bold text-red-400">{kpis?.overdueFollowUps ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-white">Freelancer Roster ({freelancers.length})</h2>
                  <p className="text-xs text-gray-400">All registered and approved caller accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddFreelancer(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Freelancer
                  </button>
                  <Link href="/admin/freelancers" className="text-xs text-blue-400 hover:underline">
                    Detailed Manager →
                  </Link>
                </div>
              </div>

              {freelancers.length === 0 ? (
                <p className="text-xs text-gray-500 py-4">No freelancers registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {freelancers.map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-white">{agent.name}</p>
                            <button
                              onClick={() => {
                                setEditingAgent(agent)
                                setEditAgentName(agent.name)
                              }}
                              className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                              title="Edit name"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">{agent.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-white">{agent._count?.assignedContacts ?? 0} contacts</p>
                          <p className="text-[11px] text-gray-400">{agent._count?.calls ?? 0} calls</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          agent.freelancerStatus === 'APPROVED' ? 'bg-green-950 text-green-400 border border-green-800' :
                          agent.freelancerStatus === 'PENDING' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {agent.freelancerStatus || 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================== ADD CONTACT MODAL ===================== */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Add New Contact</h2>
              <button onClick={() => setShowAddContact(false)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'name', label: 'School / Contact Name *', type: 'text', placeholder: 'e.g. Al Rayah Driving School' },
                { key: 'phone', label: 'Primary Phone *', type: 'tel', placeholder: '+974...' },
                { key: 'phone2', label: 'Mobile / WhatsApp (optional)', type: 'tel', placeholder: '+974...' },
                { key: 'company', label: 'Company / Institution', type: 'text', placeholder: 'optional' },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'optional' },
                { key: 'source', label: 'Source', type: 'text', placeholder: 'MOI / Website / LinkedIn' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-gray-300">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={newContact[field.key as keyof typeof newContact] as string}
                    onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-gray-300">Call Priority</label>
                <select
                  value={newContact.callPriority}
                  onChange={e => setNewContact(p => ({ ...p, callPriority: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[44px] focus:outline-none"
                >
                  <option value="">No Priority</option>
                  <option value="A">Priority A</option>
                  <option value="B">Priority B</option>
                </select>
              </div>

              {/* Assign to Freelancer immediately */}
              <div>
                <label className="text-sm font-medium text-gray-300">Assign to Freelancer (optional)</label>
                <select
                  value={newContact.assignedToId}
                  onChange={e => setNewContact(p => ({ ...p, assignedToId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[44px] focus:outline-none"
                >
                  <option value="">Leave Unassigned</option>
                  {approvedFreelancers.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Topic to discuss</label>
                <textarea
                  placeholder="Target role, decision maker, or talking points..."
                  value={newContact.topic}
                  onChange={e => setNewContact(p => ({ ...p, topic: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleAddContact}
                disabled={!newContact.name || !newContact.phone || addingContact}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-950"
              >
                {addingContact ? 'Adding Contact...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADD FREELANCER MODAL ===================== */}
      {showAddFreelancer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Create New Freelancer</h2>
              <button
                onClick={() => setShowAddFreelancer(false)}
                className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFreelancer} className="p-4 space-y-3">
              {createFreelancerError && (
                <div className="bg-red-950 border border-red-900 text-red-300 text-xs p-3 rounded-xl">
                  {createFreelancerError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-300">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newFreelancer.name}
                  onChange={e => setNewFreelancer(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={newFreelancer.email}
                  onChange={e => setNewFreelancer(p => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+974..."
                  value={newFreelancer.phone}
                  onChange={e => setNewFreelancer(p => ({ ...p, phone: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Password * (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newFreelancer.password}
                  onChange={e => setNewFreelancer(p => ({ ...p, password: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingFreelancer || !newFreelancer.name || !newFreelancer.email || !newFreelancer.password}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-950"
                >
                  {creatingFreelancer ? 'Creating Freelancer...' : 'Create Approved Freelancer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ASSIGN / REASSIGN MODAL ===================== */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">Assign Contact</h2>
                <p className="text-xs text-gray-400">{showAssign.name}</p>
              </div>
              <button onClick={() => setShowAssign(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {showAssign.assignedTo ? (
                <div className="bg-indigo-950/50 border border-indigo-800/80 rounded-xl p-3 text-xs text-indigo-300">
                  Currently assigned to: <strong>{showAssign.assignedTo.name}</strong>
                </div>
              ) : (
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-300">
                  Currently unassigned (in pool).
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-300">Select Freelancer</label>
                <select
                  value={assignAgentId}
                  onChange={e => setAssignAgentId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm min-h-[44px] focus:outline-none"
                >
                  <option value="">-- Choose Freelancer --</option>
                  {approvedFreelancers.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                  {showAssign.assignedTo && (
                    <option value="unassigned">⚠️ Unassign (Return to Unassigned Pool)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Topic to discuss *</label>
                <textarea
                  placeholder="What should the freelancer discuss on this call?"
                  value={assignTopic}
                  onChange={e => setAssignTopic(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleAssign}
                disabled={assigning}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-950"
              >
                {assigning ? 'Saving Assignment...' : assignAgentId === 'unassigned' ? 'Unassign Contact' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CONTACT DETAIL MODAL ===================== */}
      {showContactDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white text-lg">{showContactDetail.name}</h2>
                {showContactDetail.company && <p className="text-xs text-gray-400">{showContactDetail.company}</p>}
              </div>
              <button onClick={() => setShowContactDetail(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <ContactDetail
              contact={showContactDetail}
              onOpenAssign={() => {
                const c = showContactDetail
                setShowContactDetail(null)
                setShowAssign(c)
                setAssignAgentId(c.assignedTo?.id || '')
                setAssignTopic(c.topic || '')
              }}
            />
          </div>
        </div>
      )}

      {/* ===================== EDIT FREELANCER NAME MODAL ===================== */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Edit Freelancer Name</h2>
              <button onClick={() => setEditingAgent(null)} className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg min-h-[44px]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Name</label>
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

function ContactDetail({ contact, onOpenAssign }: { contact: Contact; onOpenAssign: () => void }) {
  const [calls, setCalls] = useState<Array<{
    id: string
    callTime: string
    outcome: string
    responseLookup?: string | null
    recommendedAction?: string | null
    interestLevel: string | null
    feedbackNotes: string | null
    agent: { name: string }
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
      {/* Assignment Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/80 border border-gray-700">
        <div>
          <span className="text-xs text-gray-400 block">Assignment Status</span>
          <p className="font-semibold text-sm text-white flex items-center gap-1.5 mt-0.5">
            {contact.assignedTo ? (
              <>
                <UserCheck className="w-4 h-4 text-green-400" />
                <span>Assigned to: <strong>{contact.assignedTo.name}</strong></span>
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300">Unassigned (In Pool)</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={onOpenAssign}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {contact.assignedTo ? 'Change Assignee' : 'Assign Freelancer'}
        </button>
      </div>

      {/* Grid of contact fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-400">Primary Phone</span><p className="font-medium text-white">{contact.phone}</p></div>
        {contact.phone2 && (
          <div><span className="text-gray-400">Mobile / WhatsApp</span><p className="font-medium text-white">{contact.phone2}</p></div>
        )}
        <div><span className="text-gray-400">Company</span><p className="font-medium text-white">{contact.company || '—'}</p></div>
        <div><span className="text-gray-400">Email</span><p className="font-medium text-white">{contact.email || '—'}</p></div>
        <div><span className="text-gray-400">Source</span><p className="font-medium text-white">{contact.source || '—'}</p></div>
        {contact.callPriority && (
          <div><span className="text-gray-400">Call Priority</span><p className="font-medium text-blue-400 font-bold">Priority {contact.callPriority}</p></div>
        )}
        <div className="col-span-2">
          <span className="text-gray-400">Status</span>
          <p className="font-medium text-white capitalize">{contact.status.replace('_', ' ')}</p>
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div className="col-span-2">
            <span className="text-gray-400">Tags / Category</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {contact.tags.map(t => (
                <span key={t.tag.id} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-full border border-gray-700">
                  {t.tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {contact.topic && (
          <div className="col-span-2 bg-blue-950/40 p-3 rounded-xl border border-blue-900/50">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Topic to discuss</span>
            <p className="font-medium text-sm text-blue-200 mt-0.5">{contact.topic}</p>
          </div>
        )}
      </div>

      {/* Call History */}
      <div>
        <h3 className="font-semibold text-sm text-white mb-2 flex items-center justify-between">
          <span>Call & Feedback History ({calls.length})</span>
        </h3>
        {calls.length === 0 ? (
          <p className="text-sm text-gray-500 py-3 text-center bg-gray-800/30 rounded-xl">No calls recorded yet</p>
        ) : (
          <div className="space-y-2.5">
            {calls.map(call => (
              <div key={call.id} className="bg-gray-800 rounded-xl p-3.5 text-sm border border-gray-700/60 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white capitalize">{call.outcome.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(call.callTime).toLocaleDateString()}</span>
                </div>

                {call.responseLookup && (
                  <div className="mt-1">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-950 text-blue-300 border border-blue-800 inline-block">
                      {call.responseLookup}
                    </span>
                  </div>
                )}

                {call.recommendedAction && (
                  <p className="text-xs text-amber-300/90 flex items-start gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Action: {call.recommendedAction}</span>
                  </p>
                )}

                {call.interestLevel && (
                  <p className="text-xs text-orange-400 capitalize">{call.interestLevel} interest</p>
                )}

                {call.feedbackNotes && (
                  <p className="text-xs text-gray-300 bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                    {call.feedbackNotes}
                  </p>
                )}

                <p className="text-[11px] text-gray-500 pt-1">Logged by: {call.agent.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
