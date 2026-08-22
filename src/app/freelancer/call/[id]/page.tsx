'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Info, Sparkles, ShieldCheck, ShieldAlert, Mail, Users } from 'lucide-react'
import { FEEDBACK_OPTIONS, FeedbackOption, INTEREST_AREAS } from '@/lib/feedback-constants'

interface Contact {
  id: string
  name: string
  phone: string
  phone2?: string | null
  callPriority?: string | null
  company: string | null
  topic: string | null
  tags?: { tag: { id: string; name: string } }[]
  calls?: CallRecord[]
  interactions?: InteractionRecord[]
}

interface CallRecord {
  id: string
  callTime: string
  outcome: string
  responseLookup?: string | null
  recommendedAction?: string | null
  interestLevel: string | null
  feedbackNotes: string | null
  agent: { name: string }
}

interface InteractionRecord {
  id: string
  type: string
  connected: boolean | null
  response: string | null
  interestArea: string | null
  notes: string | null
  occurredAt: string
  freelancer: { name: string }
}

function defaultNextDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(10, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function FreelancerCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Verification state
  const [verifiedAttempt, setVerifiedAttempt] = useState<{ id: string; triggeredAt: string } | null>(null)

  // Form state
  const [interactionType, setInteractionType] = useState<'CALL' | 'EMAIL' | 'MEETING'>('CALL')
  const [isConnected, setIsConnected] = useState<boolean>(true)
  const [selectedResponse, setSelectedResponse] = useState<string>('')
  const [selectedInterestArea, setSelectedInterestArea] = useState<string>('')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [scheduleNext, setScheduleNext] = useState(true)
  const [activityType, setActivityType] = useState('call')
  const [nextDate, setNextDate] = useState(defaultNextDate())

  const currentOption = FEEDBACK_OPTIONS.find(o => o.value === selectedResponse)

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        const [contactRes, attemptRes] = await Promise.all([
          fetch(`/api/contacts/${id}`),
          fetch(`/api/call-attempts?contactId=${id}`),
        ])

        if (contactRes.ok && !ignore) {
          const contactData = await contactRes.json()
          setContact(contactData)
        }

        if (attemptRes.ok && !ignore) {
          const attemptData = await attemptRes.json()
          if (attemptData.verified && attemptData.callAttempt) {
            setVerifiedAttempt(attemptData.callAttempt)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadData()
    return () => { ignore = true }
  }, [id])

  const handleCallTap = (phoneToCall: string) => {
    try {
      const payload = JSON.stringify({ contactId: id })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/call-attempts', blob)
      } else {
        fetch('/api/call-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
      setVerifiedAttempt({ id: 'just-tapped', triggeredAt: new Date().toISOString() })
    } catch {}
  }

  const handleResponseChange = (value: string) => {
    setSelectedResponse(value)
    const opt = FEEDBACK_OPTIONS.find(o => o.value === value)
    if (opt) {
      if (opt.nextActivityRequired === false) {
        setScheduleNext(false)
      } else {
        setScheduleNext(true)
        if (value.toLowerCase().includes('demo')) setActivityType('meeting')
        else if (value.toLowerCase().includes('email')) setActivityType('email')
        else setActivityType('call')
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        contactId: id,
        type: interactionType,
        connected: interactionType === 'CALL' ? isConnected : null,
        callAttemptId: interactionType === 'CALL' && verifiedAttempt && verifiedAttempt.id !== 'just-tapped' ? verifiedAttempt.id : null,
        response: (interactionType === 'CALL' && !isConnected) ? 'No Answer / Unreachable' : selectedResponse || null,
        interestArea: selectedInterestArea || null,
        notes: feedbackNotes || null,
        nextActivityRequired: scheduleNext,
        nextActivityDate: scheduleNext ? nextDate : null,
        nextActivity: scheduleNext ? activityType : null,
      }

      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => router.push('/freelancer'), 1000)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save interaction')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs text-[var(--text-muted)]">Loading contact...</div>
  if (!contact) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs text-[var(--text-muted)]">Contact not found</div>

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2.5">
          <button
            onClick={() => router.push('/freelancer')}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg)] text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[var(--text-primary)] truncate">{contact.name}</h1>
            {contact.company && <p className="text-[10px] text-[var(--text-muted)]">{contact.company}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-24">
        {/* Contact Info & Call Action Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${contact.phone}`}
              onClick={() => handleCallTap(contact.phone)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-[var(--radius-md)] text-sm flex items-center justify-center gap-2 shadow-xs transition-colors min-h-[48px]"
            >
              <Phone className="w-4 h-4" />
              <span>Call Primary: <strong className="font-mono">{contact.phone}</strong></span>
            </a>

            {contact.phone2 && (
              <a
                href={`tel:${contact.phone2}`}
                onClick={() => handleCallTap(contact.phone2!)}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-2.5 px-4 rounded-[var(--radius-md)] text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call WhatsApp: <strong className="font-mono">{contact.phone2}</strong></span>
              </a>
            )}
          </div>

          {/* Explicit Icon + Text Verification Badge */}
          {interactionType === 'CALL' && (
            <div className="pt-2 border-t border-[var(--border)]">
              {verifiedAttempt ? (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-bold">Call Verified: </span>
                    <span className="text-[11px]">Dialer tap recorded</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold">Unverified Call: </span>
                    <span className="text-[11px]">No tap detected</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {contact.topic && (
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Talking Point: </span>
              {contact.topic}
            </div>
          )}
        </div>

        {/* Interaction Type Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] p-1 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          {[
            { key: 'CALL', label: 'Call Log', icon: Phone },
            { key: 'EMAIL', label: 'Email', icon: Mail },
            { key: 'MEETING', label: 'Meeting', icon: Users },
          ].map(tab => {
            const Icon = tab.icon
            const active = interactionType === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setInteractionType(tab.key as typeof interactionType)}
                className={`py-2 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Call Specific: Connected or Unanswered Switch */}
        {interactionType === 'CALL' && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-2">
            <h3 className="font-semibold text-xs text-[var(--text-primary)]">Did the prospect answer? *</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsConnected(true)}
                className={`py-2.5 px-3 rounded-[var(--radius-sm)] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isConnected
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Yes — Connected</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConnected(false)}
                className={`py-2.5 px-3 rounded-[var(--radius-sm)] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  !isConnected
                    ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500'
                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>No Answer / Busy</span>
              </button>
            </div>
          </div>
        )}

        {/* Response & Notes Form */}
        {(interactionType !== 'CALL' || isConnected) && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
            <div>
              <label className="font-semibold text-xs text-[var(--text-primary)] block mb-1">Standardized Response Outcome *</label>
              <select
                value={selectedResponse}
                onChange={e => handleResponseChange(e.target.value)}
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

            {currentOption && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-blue-500/5 border border-blue-500/20 text-[11px] text-[var(--text-secondary)] space-y-1">
                <p><strong className="text-[var(--text-primary)]">Guidance: </strong>{currentOption.description}</p>
                <p><strong className="text-[var(--accent)]">Next Step: </strong>{currentOption.recommendedNextAction}</p>
              </div>
            )}

            <div>
              <label className="font-semibold text-xs text-[var(--text-primary)] block mb-1">Interest Area (optional)</label>
              <select
                value={selectedInterestArea}
                onChange={e => setSelectedInterestArea(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="">-- Select solution area --</option>
                {INTEREST_AREAS.map(area => (
                  <option key={area.value} value={area.value}>{area.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-xs text-[var(--text-primary)] block mb-1">Call Notes</label>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                rows={2}
                placeholder="Fleet size, existing supplier, decision-maker notes..."
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Schedule Follow-up Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[var(--text-primary)]">Follow-up Activity</span>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={e => setScheduleNext(e.target.checked)}
                className="rounded-[2px]"
              />
              <span>Schedule follow-up</span>
            </label>
          </div>

          {scheduleNext && (
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex gap-2">
                {['call', 'email', 'meeting'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className={`flex-1 py-1.5 rounded-[var(--radius-sm)] border capitalize text-xs font-semibold ${
                      activityType === t
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
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving || saved || (interactionType === 'CALL' && isConnected && !selectedResponse)}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold py-3.5 rounded-[var(--radius-md)] text-sm shadow-xs transition-colors disabled:opacity-50 min-h-[48px]"
        >
          {saved ? '✓ Saved! Returning to queue...' : saving ? 'Saving...' : 'Save Interaction Record'}
        </button>
      </div>
    </main>
  )
}
