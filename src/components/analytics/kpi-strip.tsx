'use client'

import { Users, Phone, CalendarCheck, FileText, CheckCircle2, AlertCircle, MessageSquare, Mail, UserCheck, UserX } from 'lucide-react'

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
  onSelectFilter?: (filterType: string) => void
}

export function KPIStrip({ kpis, onSelectFilter }: KPIStripProps) {
  const cards = [
    { key: 'all', label: 'Total Prospects', value: kpis.totalProspects, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80' },
    { key: 'assigned', label: 'Assigned', value: kpis.assignedProspects, icon: UserCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80' },
    { key: 'unassigned', label: 'Unassigned', value: kpis.unassignedProspects, icon: UserX, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80' },
    { key: 'interactions', label: 'Interactions Logged', value: kpis.totalInteractions, icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/80' },
    { key: 'calls', label: 'Calls Logged', value: kpis.callsLogged, icon: Phone, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80' },
    { key: 'followups', label: 'Follow-ups Due', value: kpis.followUpsDue, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80' },
    { key: 'demos', label: 'Demos Booked', value: kpis.demosBooked, icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80' },
    { key: 'quotes', label: 'Quotations', value: kpis.quotationsRequested, icon: FileText, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/80' },
    { key: 'converted', label: `Converted (${kpis.conversionRate}%)`, value: kpis.converted, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/80' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <button
            key={card.key}
            onClick={() => onSelectFilter?.(card.key)}
            className={`text-left p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{card.value}</p>
          </button>
        )
      })}
    </div>
  )
}
