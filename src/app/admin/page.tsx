'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Users, Phone, TrendingUp, AlertCircle, Upload, UserPlus, Bell,
  Pencil, Search, Filter, CheckCircle2, UserCheck, UserX, Tag as TagIcon,
  Sparkles, Trash2, History, BarChart3, Edit3, ArrowRight, ShieldAlert,
  Calendar, RotateCcw
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'

// Analytics Components
import { KPIStrip, KPIsData } from '@/components/analytics/kpi-strip'
import { TagCoverageChart } from '@/components/analytics/tag-coverage-chart'
import { FreelancerWorkloadTable } from '@/components/analytics/freelancer-workload-table'
import { ConnectedChart } from '@/components/analytics/connected-chart'
import { InteractionsTimeline } from '@/components/analytics/interactions-timeline'
import { ResponseAnalyticsChart } from '@/components/analytics/response-analytics-chart'
import { InterestAreaChart } from '@/components/analytics/interest-area-chart'
import { FollowupPipelineCard } from '@/components/analytics/followup-pipeline-card'
import { DataQualityPanel } from '@/components/analytics/data-quality-panel'
import { SalesFunnelChart } from '@/components/analytics/sales-funnel-chart'

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
  _count?: { calls: number; interactions?: number }
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
  new: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700',
  queued: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
  contacted: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800',
  follow_up: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
  converted: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800',
  lost: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800',
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'analytics' | 'contacts' | 'overdue' | 'performance'>('analytics')
  
  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsDateRange, setAnalyticsDateRange] = useState('all') // all | today | 7d | 30d
  const [analyticsFreelancer, setAnalyticsFreelancer] = useState('all')
  const [analyticsTag, setAnalyticsTag] = useState('all')
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [overdueList, setOverdueList] = useState<OverdueActivity[]>([])
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [pendingFreelancers, setPendingFreelancers] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [filterAssignment, setFilterAssignment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddFreelancer, setShowAddFreelancer] = useState(false)
  const [showAssign, setShowAssign] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState<Contact | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  
  // Add Contact Form
  const [newContact, setNewContact] = useState({
    name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '', callPriority: '', assignedToId: '', tagIds: [] as string[]
  })
  const [addingContact, setAddingContact] = useState(false)

  // Edit Contact Form
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', phone2: '', email: '', company: '', source: '', topic: '', callPriority: '', status: '', tagIds: [] as string[]
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Add Freelancer Form
  const [newFreelancer, setNewFreelancer] = useState({ name: '', email: '', phone: '', password: '', applicationNote: '' })
  const [creatingFreelancer, setCreatingFreelancer] = useState(false)
  const [createFreelancerError, setCreateFreelancerError] = useState('')

  // Assign Form
  const [assignAgentId, setAssignAgentId] = useState('')
  const [assignTopic, setAssignTopic] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch Analytics Data
  useEffect(() => {
    let ignore = false
    async function loadAnalytics() {
      setAnalyticsLoading(true)
      try {
        const query = new URLSearchParams()
        query.set('dateRange', analyticsDateRange)
        if (analyticsFreelancer && analyticsFreelancer !== 'all') query.set('freelancerId', analyticsFreelancer)
        if (analyticsTag && analyticsTag !== 'all') query.set('tagId', analyticsTag)

        const res = await fetch(`/api/admin/analytics?${query.toString()}`)
        if (res.ok && !ignore) {
          const data = await res.json()
          setAnalyticsData(data)
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
      } finally {
        if (!ignore) setAnalyticsLoading(false)
      }
    }

    loadAnalytics()
    return () => { ignore = true }
  }, [analyticsDateRange, analyticsFreelancer, analyticsTag, refreshKey])

  // Fetch Core Contacts & Freelancer Data
  useEffect(() => {
    let ignore = false
    async function loadCoreData() {
      try {
        const queryParams = new URLSearchParams()
        if (search) queryParams.set('search', search)
        if (filterAssignment && filterAssignment !== 'all') queryParams.set('assignment', filterAssignment)
        if (filterStatus) queryParams.set('status', filterStatus)
        if (filterPriority) queryParams.set('callPriority', filterPriority)
        if (filterTag) queryParams.set('tagId', filterTag)

        const [contactsRes, freelancersRes, tagsRes, dashRes] = await Promise.all([
          fetch(`/api/contacts?${queryParams.toString()}`),
          fetch('/api/admin/freelancers'),
          fetch('/api/admin/tags'),
          fetch('/api/admin/dashboard'),
        ])

        const [contactsData, freelancersData, tagsData, dashData] = await Promise.all([
          contactsRes.json(),
          freelancersRes.json(),
          tagsRes.json(),
          dashRes.json(),
        ])

        if (!ignore) {
          if (Array.isArray(contactsData)) setContacts(contactsData)
          if (Array.isArray(freelancersData)) setFreelancers(freelancersData)
          if (Array.isArray(tagsData)) setTags(tagsData)
          if (dashData?.overdueList) setOverdueList(dashData.overdueList)
          if (dashData?.pendingFreelancers !== undefined) setPendingFreelancers(dashData.pendingFreelancers)
        }
      } catch (e) {
        console.error('Error loading core data:', e)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadCoreData()
    return () => { ignore = true }
  }, [search, filterAssignment, filterStatus, filterPriority, filterTag, refreshKey])

  const refreshAll = () => setRefreshKey(k => k + 1)

  // Actions
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

  const openEditContact = (c: Contact) => {
    setEditingContact(c)
    setEditFormData({
      name: c.name,
      phone: c.phone,
      phone2: c.phone2 || '',
      email: c.email || '',
      company: c.company || '',
      source: c.source || '',
      topic: c.topic || '',
      callPriority: c.callPriority || '',
      status: c.status || 'new',
      tagIds: c.tags?.map(t => t.tag.id) || [],
    })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingContact) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })
      if (res.ok) {
        setEditingContact(null)
        refreshAll()
      } else {
        alert('Failed to update contact')
      }
    } catch {
      alert('Error updating contact')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteContact() {
    if (!deletingContact) return
    try {
      const res = await fetch(`/api/contacts/${deletingContact.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingContact(null)
        setShowContactDetail(null)
        refreshAll()
      } else {
        alert('Failed to delete contact')
      }
    } catch {
      alert('Error connecting to server')
    }
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

  const approvedFreelancers = freelancers.filter(f => f.freelancerStatus === 'APPROVED' || !f.freelancerStatus)
  const assignedCount = contacts.filter(c => c.assignedTo).length
  const unassignedCount = contacts.filter(c => !c.assignedTo).length

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">Call Track — Admin Command Center</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.name || 'Administrator'} • AutoTrace Qatar</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/freelancers"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 min-h-[36px]"
            >
              Freelancers ({freelancers.length})
              {pendingFreelancers > 0 && (
                <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingFreelancers}
                </span>
              )}
            </Link>

            <Link
              href="/admin/tags"
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 min-h-[36px] flex items-center"
            >
              Tags ({tags.length})
            </Link>

            <Link
              href="/admin/activity-logs"
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 min-h-[36px] flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" />
              Audit Logs
            </Link>

            <Link
              href="/admin/contacts/deleted"
              className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-medium text-red-700 dark:text-red-300 transition-colors border border-red-200 dark:border-red-800 min-h-[36px] flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deleted Pool
            </Link>

            <ThemeToggle />
            <NotificationBell />

            <button
              onClick={() => signOut({ callbackUrl: '/auth/signed-out' })}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 px-2 py-1 min-h-[36px] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Main Tab Switcher */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-x-auto">
          {[
            { key: 'analytics', label: '📊 Command Center Analytics' },
            { key: 'contacts', label: `📋 Contacts & Assignment (${contacts.length})` },
            { key: 'overdue', label: `⚠️ Overdue Follow-ups (${overdueList.length})` },
            { key: 'performance', label: '👥 Freelancer Roster' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl min-h-[40px] whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ===================== TAB 1: ANALYTICS ===================== */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            {/* Filter Bar for Analytics */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter Horizon:
                </span>
                
                {/* Date Horizon Pills */}
                {['all', 'today', '7d', '30d'].map(d => (
                  <button
                    key={d}
                    onClick={() => setAnalyticsDateRange(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      analyticsDateRange === d
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Freelancer Filter */}
                <select
                  value={analyticsFreelancer}
                  onChange={e => setAnalyticsFreelancer(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="all">👥 All Freelancers</option>
                  {approvedFreelancers.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                {/* Tag Filter */}
                <select
                  value={analyticsTag}
                  onChange={e => setAnalyticsTag(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="all">🏷️ All Tags</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {analyticsLoading || !analyticsData ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-sm">
                Loading analytics metrics and charts...
              </div>
            ) : (
              <>
                {/* Panel 1: Top KPI Strip */}
                <KPIStrip
                  kpis={analyticsData.kpis}
                  onSelectFilter={(type) => {
                    setTab('contacts')
                    if (type === 'unassigned') setFilterAssignment('unassigned')
                    else if (type === 'assigned') setFilterAssignment('assigned')
                    else if (type === 'converted') setFilterStatus('converted')
                  }}
                />

                {/* Panel 8: Follow-up Pipeline Horizon Card */}
                <FollowupPipelineCard data={analyticsData.followupPipeline} onSelectBucket={() => setTab('overdue')} />

                {/* Panels 2 & 4: Tag Coverage & Connected vs Not Connected Calls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TagCoverageChart data={analyticsData.tagCoverage} />
                  <ConnectedChart data={analyticsData.connectedVsNot} />
                </div>

                {/* Panels 5 & 6: Interactions Timeline & Response Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <InteractionsTimeline data={analyticsData.interactionsTimeline} />
                  <ResponseAnalyticsChart data={analyticsData.responseBreakdown} />
                </div>

                {/* Panels 7 & 10: Interest Areas & Sales Conversion Funnel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <InterestAreaChart data={analyticsData.interestAreaBreakdown} />
                  <SalesFunnelChart data={analyticsData.salesFunnel} />
                </div>

                {/* Panel 3: Freelancer Workload & Productivity Table */}
                <FreelancerWorkloadTable data={analyticsData.freelancerWorkload} />

                {/* Panel 9: Data Quality & Database Health */}
                <DataQualityPanel data={analyticsData.dataQuality} />
              </>
            )}
          </div>
        )}

        {/* ===================== TAB 2: CONTACTS ===================== */}
        {tab === 'contacts' && (
          <div className="space-y-3">
            {/* Segmented 1-Click Toggle */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <button
                type="button"
                onClick={() => setFilterAssignment('all')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>📋 All Contacts</span>
                <span className="bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-full text-[11px]">{contacts.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterAssignment('unassigned')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'unassigned'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <UserX className="w-4 h-4 text-amber-500" />
                <span>Unassigned Pool</span>
                <span className="bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-full text-[11px] font-bold">{unassignedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterAssignment('assigned')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  filterAssignment === 'assigned'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-green-500" />
                <span>Assigned Leads</span>
                <span className="bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-full text-[11px] font-bold">{assignedCount}</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 space-y-3 shadow-sm">
              <div className="flex gap-2 flex-wrap items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    placeholder="Search by name, phone, company, freelancer, tag..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                  />
                </div>

                {/* Freelancer Filter */}
                <select
                  value={filterAssignment.startsWith('all') || filterAssignment === 'assigned' || filterAssignment === 'unassigned' ? '' : filterAssignment}
                  onChange={e => setFilterAssignment(e.target.value || 'all')}
                  className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none min-h-[42px]"
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
                  className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none min-h-[42px]"
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
                  className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none min-h-[42px]"
                >
                  <option value="">Priority: All</option>
                  <option value="A">Priority A</option>
                  <option value="B">Priority B</option>
                </select>

                {/* Tag Filter */}
                <select
                  value={filterTag}
                  onChange={e => setFilterTag(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none min-h-[42px]"
                >
                  <option value="">Tag: All</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Actions */}
                <button
                  onClick={() => setShowAddContact(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold min-h-[42px] transition-colors shrink-0 shadow-md shadow-blue-500/20"
                >
                  <UserPlus className="w-4 h-4" /> Add Contact
                </button>
                <label className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3.5 py-2 rounded-xl text-sm font-medium min-h-[42px] cursor-pointer transition-colors border border-gray-200 dark:border-gray-700 shrink-0">
                  <Upload className="w-4 h-4" /> Import CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                </label>
              </div>
            </div>

            {/* Contacts Listing */}
            <div className="space-y-2.5">
              {loading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 space-y-2">
                  <p className="text-2xl">🔍</p>
                  <p className="font-semibold text-gray-900 dark:text-white">No contacts match the current filter</p>
                  <button
                    onClick={() => { setSearch(''); setFilterAssignment('all'); setFilterStatus(''); setFilterPriority(''); setFilterTag('') }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                contacts.map(contact => {
                  const assigned = contact.assignedTo
                  return (
                    <div
                      key={contact.id}
                      className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border transition-all ${
                        !assigned
                          ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-700'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowContactDetail(contact)}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              {contact.name}
                            </p>

                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[contact.status] || 'bg-gray-100 text-gray-800'}`}>
                              {contact.status.replace('_', ' ')}
                            </span>

                            {contact.callPriority && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                Priority {contact.callPriority}
                              </span>
                            )}

                            {assigned ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                Assigned: {assigned.name}
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <UserX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                UNASSIGNED
                              </span>
                            )}
                          </div>

                          {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{contact.company}</p>}

                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                            <span>📞 {contact.phone}</span>
                            {contact.phone2 && <span>📱 {contact.phone2}</span>}
                            {contact.email && <span>✉️ {contact.email}</span>}
                            {contact._count?.interactions !== undefined && (
                              <span className="text-gray-400">({contact._count.interactions} interactions)</span>
                            )}
                          </div>

                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {contact.tags.map(t => (
                                <span key={t.tag.id} className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                  {t.tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {contact.topic && (
                            <p className="text-xs text-blue-800 dark:text-blue-300 mt-1.5 line-clamp-1 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/40">
                              📋 Topic: {contact.topic}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setShowAssign(contact)
                              setAssignAgentId(contact.assignedTo?.id || '')
                              setAssignTopic(contact.topic || '')
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              assigned
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                                : 'bg-green-600 text-white hover:bg-green-700 border-green-600 shadow-md shadow-green-600/20'
                            }`}
                          >
                            {assigned ? 'Reassign' : 'Assign Lead'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditContact(contact)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                              title="Edit Contact"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingContact(contact)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/60 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                              title="Soft Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setShowContactDetail(contact)}
                              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-1.5 py-1 font-medium"
                            >
                              Details →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: OVERDUE ===================== */}
        {tab === 'overdue' && (
          <div className="space-y-3">
            {overdueList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400 opacity-60" />
                <p className="font-semibold text-gray-900 dark:text-white">No overdue follow-ups</p>
                <p className="text-xs text-gray-500 mt-1">All scheduled caller activities are on time.</p>
              </div>
            ) : (
              overdueList.map(activity => (
                <div key={activity.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-red-200 dark:border-red-900/80 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{activity.contact.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.contact.phone}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                      {activity.activityType.toUpperCase()} — due {new Date(activity.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Assigned to: {activity.agent.name}</p>
                  </div>
                  <button
                    onClick={() => handleRemind(activity.id)}
                    className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border border-orange-200 dark:border-orange-800"
                  >
                    <Bell className="w-3.5 h-3.5" /> Send Reminder
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===================== TAB 4: FREELANCER ROSTER ===================== */}
        {tab === 'performance' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Active Freelancers ({freelancers.length})</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Caller accounts and lead assignments</p>
                </div>
                <button
                  onClick={() => setShowAddFreelancer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Freelancer
                </button>
              </div>

              <div className="space-y-2">
                {freelancers.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{agent.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{agent._count?.assignedContacts ?? 0} leads assigned</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        agent.freelancerStatus === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {agent.freelancerStatus || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Edit Contact</h2>
                <p className="text-xs text-gray-500">Changes will be logged in the system audit trail.</p>
              </div>
              <button onClick={() => setEditingContact(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={e => setEditFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mobile / WhatsApp</label>
                  <input
                    type="tel"
                    value={editFormData.phone2}
                    onChange={e => setEditFormData(p => ({ ...p, phone2: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={e => setEditFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company / Organization</label>
                  <input
                    type="text"
                    value={editFormData.company}
                    onChange={e => setEditFormData(p => ({ ...p, company: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    value={editFormData.callPriority}
                    onChange={e => setEditFormData(p => ({ ...p, callPriority: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none"
                  >
                    <option value="">None</option>
                    <option value="A">Priority A</option>
                    <option value="B">Priority B</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData(p => ({ ...p, status: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none"
                  >
                    {['new', 'queued', 'contacted', 'follow_up', 'converted', 'lost'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Topic to discuss</label>
                <textarea
                  value={editFormData.topic}
                  onChange={e => setEditFormData(p => ({ ...p, topic: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save & Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Delete Contact?</h3>
                <p className="text-xs text-gray-500">Soft delete archive</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to delete <strong>{deletingContact.name}</strong>?
              {deletingContact.assignedTo && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ This contact is currently assigned to {deletingContact.assignedTo.name}. Deleting it will automatically unassign them.
                </span>
              )}
              <span className="block mt-1 text-gray-500">
                You can restore this contact anytime from the Deleted Pool.
              </span>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContact(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-md shadow-red-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Add New Contact</h2>
              <button onClick={() => setShowAddContact(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">✕</button>
            </div>

            {[
              { key: 'name', label: 'Prospect / School Name *', type: 'text', placeholder: 'e.g. Al Rayah Driving School' },
              { key: 'phone', label: 'Primary Phone *', type: 'tel', placeholder: '+974...' },
              { key: 'phone2', label: 'Mobile / WhatsApp (optional)', type: 'tel', placeholder: '+974...' },
              { key: 'company', label: 'Company / Institution', type: 'text', placeholder: 'optional' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'optional' },
              { key: 'source', label: 'Source', type: 'text', placeholder: 'MOI / Website / LinkedIn' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={newContact[field.key as keyof typeof newContact] as string}
                  onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Call Priority</label>
              <select
                value={newContact.callPriority}
                onChange={e => setNewContact(p => ({ ...p, callPriority: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none"
              >
                <option value="">No Priority</option>
                <option value="A">Priority A</option>
                <option value="B">Priority B</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Topic to discuss</label>
              <textarea
                placeholder="Target role, decision maker, or talking points..."
                value={newContact.topic}
                onChange={e => setNewContact(p => ({ ...p, topic: e.target.value }))}
                rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleAddContact}
              disabled={!newContact.name || !newContact.phone || addingContact}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/20"
            >
              {addingContact ? 'Adding Contact...' : 'Create Prospect'}
            </button>
          </div>
        </div>
      )}

      {/* Add Freelancer Modal */}
      {showAddFreelancer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Add Approved Freelancer</h2>
              <button onClick={() => setShowAddFreelancer(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCreateFreelancer} className="space-y-3">
              {createFreelancerError && (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl">
                  {createFreelancerError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Caller"
                  value={newFreelancer.name}
                  onChange={e => setNewFreelancer(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="sarah@example.com"
                  value={newFreelancer.email}
                  onChange={e => setNewFreelancer(p => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password * (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newFreelancer.password}
                  onChange={e => setNewFreelancer(p => ({ ...p, password: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingFreelancer || !newFreelancer.name || !newFreelancer.email || !newFreelancer.password}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/20"
                >
                  {creatingFreelancer ? 'Creating...' : 'Create Approved Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Reassign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Assign Lead</h2>
                <p className="text-xs text-gray-500">{showAssign.name}</p>
              </div>
              <button onClick={() => setShowAssign(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Choose Freelancer</label>
              <select
                value={assignAgentId}
                onChange={e => setAssignAgentId(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none"
              >
                <option value="">-- Select Freelancer --</option>
                {approvedFreelancers.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                {showAssign.assignedTo && (
                  <option value="unassigned">⚠️ Unassign (Send to Unassigned Pool)</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Topic / Instructions for caller</label>
              <textarea
                value={assignTopic}
                onChange={e => setAssignTopic(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm focus:outline-none resize-none"
                placeholder="What should the freelancer discuss on this call?"
              />
            </div>

            <button
              onClick={handleAssign}
              disabled={assigning}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-indigo-500/20"
            >
              {assigning ? 'Saving Assignment...' : assignAgentId === 'unassigned' ? 'Unassign Contact' : 'Save Assignment'}
            </button>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showContactDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">{showContactDetail.name}</h2>
                {showContactDetail.company && <p className="text-xs text-gray-500">{showContactDetail.company}</p>}
              </div>
              <button onClick={() => setShowContactDetail(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">✕</button>
            </div>

            <ContactDetailView
              contact={showContactDetail}
              onOpenAssign={() => {
                const c = showContactDetail
                setShowContactDetail(null)
                setShowAssign(c)
                setAssignAgentId(c.assignedTo?.id || '')
                setAssignTopic(c.topic || '')
              }}
              onOpenEdit={() => {
                const c = showContactDetail
                setShowContactDetail(null)
                openEditContact(c)
              }}
              onOpenDelete={() => {
                const c = showContactDetail
                setDeletingContact(c)
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}

function ContactDetailView({
  contact,
  onOpenAssign,
  onOpenEdit,
  onOpenDelete,
}: {
  contact: Contact
  onOpenAssign: () => void
  onOpenEdit: () => void
  onOpenDelete: () => void
}) {
  const [interactions, setInteractions] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/interactions?contactId=${contact.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setInteractions(data)
      })
      .catch(() => {})
  }, [contact.id])

  return (
    <div className="space-y-4 text-xs">
      {/* Assignment Header Card */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-[11px] text-gray-500 block">Current Assignment</span>
          <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1 mt-0.5">
            {contact.assignedTo ? (
              <>
                <UserCheck className="w-4 h-4 text-green-500" />
                <span>{contact.assignedTo.name}</span>
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Unassigned Lead</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAssign}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors"
          >
            {contact.assignedTo ? 'Reassign' : 'Assign'}
          </button>
          <button
            onClick={onOpenEdit}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-semibold px-3 py-1.5 rounded-xl transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onOpenDelete}
            className="bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-400 font-semibold p-1.5 rounded-xl transition-colors"
            title="Delete Contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/30 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div><span className="text-gray-500">Phone</span><p className="font-semibold text-gray-900 dark:text-white">{contact.phone}</p></div>
        <div><span className="text-gray-500">Mobile / WhatsApp</span><p className="font-semibold text-gray-900 dark:text-white">{contact.phone2 || '—'}</p></div>
        <div><span className="text-gray-500">Email</span><p className="font-semibold text-gray-900 dark:text-white">{contact.email || '—'}</p></div>
        <div><span className="text-gray-500">Company</span><p className="font-semibold text-gray-900 dark:text-white">{contact.company || '—'}</p></div>
        <div><span className="text-gray-500">Call Priority</span><p className="font-bold text-blue-600 dark:text-blue-400">{contact.callPriority ? `Priority ${contact.callPriority}` : '—'}</p></div>
        <div><span className="text-gray-500">Status</span><p className="font-semibold text-gray-900 dark:text-white capitalize">{contact.status.replace('_', ' ')}</p></div>
        {contact.topic && (
          <div className="col-span-2 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Topic: </span>
            <span className="text-gray-800 dark:text-gray-200">{contact.topic}</span>
          </div>
        )}
      </div>

      {/* Interaction History */}
      <div className="space-y-2">
        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Interaction History ({interactions.length})</h4>
        {interactions.length === 0 ? (
          <p className="text-center py-4 text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">No interactions logged yet</p>
        ) : (
          interactions.map(item => (
            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-900 dark:text-white capitalize">{item.type} {item.connected !== null ? (item.connected ? '— Connected' : '— Unanswered') : ''}</span>
                <span className="text-gray-400">{new Date(item.occurredAt).toLocaleDateString()}</span>
              </div>
              {item.response && (
                <span className="inline-block px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {item.response}
                </span>
              )}
              {item.interestArea && <p className="text-purple-600 dark:text-purple-300">📦 {item.interestArea}</p>}
              {item.notes && <p className="text-gray-600 dark:text-gray-300">{item.notes}</p>}
              <p className="text-[10px] text-gray-400">by {item.freelancer?.name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
