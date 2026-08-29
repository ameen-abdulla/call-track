'use client'

import React, { useState } from 'react'
import { Clock, AlertTriangle, CheckCircle2, PhoneCall, HelpCircle } from 'lucide-react'
import { ContactUrgency, UrgencyStatus } from '@/lib/urgency'

interface UrgencyBadgeProps {
  urgency?: ContactUrgency | null
  className?: string
  compact?: boolean
}

export function UrgencyBadge({ urgency, className = '', compact = false }: UrgencyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!urgency || urgency.status === 'excluded') {
    return null
  }

  const { status, hoursElapsed, assignedAt, firstAttemptAt } = urgency

  let icon = CheckCircle2
  let label = 'Fresh'
  let bgClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
  let dotClass = 'bg-emerald-500'
  let tooltipText = ''

  const formattedHours = hoursElapsed !== null ? `${Math.floor(hoursElapsed)}h` : ''

  switch (status) {
    case 'green':
      icon = CheckCircle2
      label = compact ? (formattedHours ? `<24h` : 'Fresh') : (formattedHours ? `< 24h (${formattedHours})` : '< 24h')
      bgClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      dotClass = 'bg-emerald-500'
      tooltipText = assignedAt
        ? `Assigned ${formattedHours || 'recently'} ago — turns orange at 24h`
        : 'Assigned recently — turns orange at 24h'
      break

    case 'orange':
      icon = Clock
      label = compact ? `${formattedHours}` : `Pending: ${formattedHours}`
      bgClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      dotClass = 'bg-amber-500'
      tooltipText = `Assigned ${formattedHours} ago — turns red at 72h`
      break

    case 'red':
      icon = AlertTriangle
      label = compact ? `${formattedHours}` : `Urgent: ${formattedHours}`
      bgClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
      dotClass = 'bg-rose-500'
      tooltipText = `Assigned ${formattedHours} ago — overdue for first outreach (>= 72h)`
      break

    case 'attempted':
      icon = PhoneCall
      label = 'Attempted'
      bgClass = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
      dotClass = 'bg-indigo-500'
      tooltipText = firstAttemptAt
        ? `Dialer tap recorded ${new Date(firstAttemptAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${hoursElapsed ? ` (${formattedHours} after assignment)` : ''}`
        : 'Click-to-call attempt recorded'
      break

    case 'unassigned':
      icon = HelpCircle
      label = 'Unassigned'
      bgClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
      dotClass = 'bg-slate-400'
      tooltipText = 'Not currently assigned to any caller'
      break

    default:
      return null
  }

  const IconComponent = icon

  return (
    <div
      className={`relative inline-flex items-center group cursor-help ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation()
        setShowTooltip(!showTooltip)
      }}
      title={tooltipText}
    >
      <span
        className={`inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] border text-[10px] select-none transition-colors ${bgClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0 animate-pulse`} />
        <IconComponent className="w-3 h-3 shrink-0" />
        <span>{label}</span>
      </span>

      {/* Tooltip on hover/tap */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-neutral-900 text-white text-[11px] font-sans rounded-md shadow-lg whitespace-nowrap z-30 pointer-events-none border border-neutral-700">
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </div>
  )
}
