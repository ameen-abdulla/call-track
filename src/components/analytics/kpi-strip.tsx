'use client'

import { Users, Phone, Calendar, Sparkles, CheckCircle2, FileText, TrendingUp, AlertTriangle } from 'lucide-react'

export interface KPIsData {
  totalProspects: number
  assignedProspects: number
  unassignedProspects: number
  totalInteractions: number
  callsLogged: number
  emailsLogged: number
  meetingsLogged: number
  followUpsDue: number
  demosBooked: number
  quotationsRequested: number
  converted: number
  conversionRate: number
}

interface KPIStripProps {
  kpis: KPIsData
  onSelectFilter?: (type: 'unassigned' | 'assigned' | 'converted' | 'all' | 'overdue' | 'calls' | 'demos') => void
}

export function KPIStrip({ kpis, onSelectFilter }: KPIStripProps) {
  const cards = [
    {
      label: 'Total Prospects',
      value: kpis.totalProspects,
      icon: Users,
      subtext: `${kpis.assignedProspects} assigned · ${kpis.unassignedProspects} unassigned`,
      action: () => onSelectFilter?.('all'),
      variant: 'default',
    },
    {
      label: 'Unassigned Pool',
      value: kpis.unassignedProspects,
      icon: Users,
      subtext: 'Awaiting caller assignment',
      action: () => onSelectFilter?.('unassigned'),
      variant: kpis.unassignedProspects > 0 ? 'warning' : 'default',
    },
    {
      label: 'Calls Logged',
      value: kpis.callsLogged,
      icon: Phone,
      subtext: `${kpis.totalInteractions} total interactions`,
      action: () => onSelectFilter?.('calls'),
      variant: 'default',
    },
    {
      label: 'Overdue Follow-ups',
      value: kpis.followUpsDue,
      icon: AlertTriangle,
      subtext: kpis.followUpsDue > 0 ? 'Urgent caller action required' : 'All activities on time',
      action: () => onSelectFilter?.('overdue'),
      variant: kpis.followUpsDue > 0 ? 'danger' : 'success',
    },
    {
      label: 'Demos Booked',
      value: kpis.demosBooked,
      icon: Sparkles,
      subtext: `${kpis.quotationsRequested} quotes requested`,
      action: () => onSelectFilter?.('demos'),
      variant: 'accent',
    },
    {
      label: 'Converted Leads',
      value: kpis.converted,
      icon: CheckCircle2,
      subtext: `${kpis.conversionRate}% overall conversion`,
      action: () => onSelectFilter?.('converted'),
      variant: 'success',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => {
        const Icon = c.icon

        let borderClass = 'border-[var(--border)]'
        let bgBadge = 'bg-[var(--surface)] text-[var(--text-secondary)]'
        let valueColor = 'text-[var(--text-primary)]'

        if (c.variant === 'warning') {
          borderClass = 'border-amber-500/40 dark:border-amber-500/30'
          bgBadge = 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        } else if (c.variant === 'danger') {
          borderClass = 'border-red-500/50 dark:border-red-500/40 ring-1 ring-red-500/20'
          bgBadge = 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
          valueColor = 'text-red-600 dark:text-red-400'
        } else if (c.variant === 'accent') {
          borderClass = 'border-[var(--accent)]/40'
          bgBadge = 'bg-[var(--accent)]/10 text-[var(--accent)]'
        } else if (c.variant === 'success') {
          borderClass = 'border-emerald-500/40'
          bgBadge = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }

        return (
          <div
            key={c.label}
            onClick={c.action}
            className={`bg-[var(--surface)] rounded-[var(--radius-md)] p-3.5 border ${borderClass} shadow-[var(--shadow-card)] cursor-pointer hover:border-[var(--accent)] transition-all duration-150 flex flex-col justify-between group`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                {c.label}
              </span>
              <div className={`p-1 rounded-[var(--radius-sm)] ${bgBadge} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${valueColor} group-hover:text-[var(--accent)] transition-colors`}>
                {c.value.toLocaleString()}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                {c.subtext}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
