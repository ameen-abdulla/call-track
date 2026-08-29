'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, Clock, PhoneCall, Users, ShieldAlert } from 'lucide-react'

export interface UrgencyPanelData {
  counts: {
    green: number
    orange: number
    red: number
    attempted: number
    unassigned: number
  }
  byFreelancer: {
    freelancerId: string
    name: string
    green: number
    orange: number
    red: number
  }[]
}

interface UrgencyPanelProps {
  data?: UrgencyPanelData | null
  onFilterClick?: (status: string) => void
}

export function UrgencyPanel({ data, onFilterClick }: UrgencyPanelProps) {
  if (!data) return null

  const { counts, byFreelancer } = data
  const totalActive = counts.green + counts.orange + counts.red
  const totalTracked = totalActive + counts.attempted

  const cards = [
    {
      key: 'red',
      label: 'Critical (>72h)',
      count: counts.red,
      icon: AlertTriangle,
      desc: 'Immediate action required',
      bgClass: 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400',
      badgeClass: 'text-rose-600 dark:text-rose-400',
      active: counts.red > 0,
    },
    {
      key: 'orange',
      label: 'Pending (24–72h)',
      count: counts.orange,
      icon: Clock,
      desc: 'Approaching SLA window',
      bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
      badgeClass: 'text-amber-600 dark:text-amber-400',
      active: counts.orange > 0,
    },
    {
      key: 'green',
      label: 'Fresh (<24h)',
      count: counts.green,
      icon: CheckCircle2,
      desc: 'Within optimal outreach SLA',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      badgeClass: 'text-emerald-600 dark:text-emerald-400',
      active: counts.green > 0,
    },
    {
      key: 'attempted',
      label: 'First Attempt Made',
      count: counts.attempted,
      icon: PhoneCall,
      desc: 'Call initiated via dialer tap',
      bgClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300',
      badgeClass: 'text-indigo-600 dark:text-indigo-300',
      active: counts.attempted > 0,
    },
  ]

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[var(--radius-sm)] bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Lead Outreach Urgency Meter</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Time elapsed since assignment for leads awaiting first outreach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold font-mono px-2.5 py-1 rounded-[var(--radius-sm)] border ${
            counts.red === 0
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}>
            {counts.red === 0 ? '✓ SLA In Good Standing' : `⚠️ ${counts.red} Overdue Lead${counts.red > 1 ? 's' : ''}`}
          </span>
          {counts.unassigned > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[var(--radius-sm)] bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              {counts.unassigned} unassigned
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.key}
              onClick={() => onFilterClick && onFilterClick(c.key)}
              className={`p-3 rounded-[var(--radius-sm)] border transition-all ${
                onFilterClick ? 'cursor-pointer hover:border-[var(--accent)]' : ''
              } ${c.bgClass}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold truncate">{c.label}</span>
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mb-2">{c.desc}</p>
              <div className="flex items-baseline justify-between pt-1 border-t border-[var(--border)]/50">
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {totalTracked > 0 ? `${Math.round((c.count / totalTracked) * 100)}%` : '0%'}
                </span>
                <span className={`text-xl font-bold font-mono ${c.badgeClass}`}>
                  {c.count}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Breakdown by Freelancer */}
      {byFreelancer && byFreelancer.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Caller Urgency Breakdown
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Awaiting Outreach Distribution</span>
          </div>

          <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg)] divide-y divide-[var(--border)]">
            {byFreelancer.map((f) => {
              const fTotal = f.green + f.orange + f.red
              return (
                <div key={f.freelancerId} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{f.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {fTotal} active lead{fTotal === 1 ? '' : 's'} in queue
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Visual Segment Bar */}
                    <div className="hidden sm:flex w-24 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-neutral-800">
                      {fTotal > 0 ? (
                        <>
                          <div style={{ width: `${(f.red / fTotal) * 100}%` }} className="bg-rose-500 h-full" title={`Red: ${f.red}`} />
                          <div style={{ width: `${(f.orange / fTotal) * 100}%` }} className="bg-amber-500 h-full" title={`Orange: ${f.orange}`} />
                          <div style={{ width: `${(f.green / fTotal) * 100}%` }} className="bg-emerald-500 h-full" title={`Green: ${f.green}`} />
                        </>
                      ) : null}
                    </div>

                    {/* Number Chips */}
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded ${f.red > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                        {f.red} red
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${f.orange > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                        {f.orange} org
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${f.green > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                        {f.green} grn
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
