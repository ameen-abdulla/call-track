'use client'

import { TrendingDown, ArrowDown } from 'lucide-react'

interface FunnelStage {
  stage: string
  count: number
  dropOff: number
  conversionFromTotal: number
}

interface SalesFunnelProps {
  data: FunnelStage[]
}

export function SalesFunnelChart({ data }: SalesFunnelProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-6 text-center text-[var(--text-muted)] text-xs">
        No sales funnel stage data recorded.
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Lead Conversion Funnel</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">Stage progression and drop-off rate from Prospect to Converted</p>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
          {data[data.length - 1]?.count || 0} Deals Won
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {data.map((stage, idx) => {
          const widthPercent = Math.max(18, Math.round((stage.count / maxCount) * 100))
          const isFinal = idx === data.length - 1
          const isInitial = idx === 0

          let barColor = 'bg-slate-400 dark:bg-slate-600 text-white'
          if (isInitial) barColor = 'bg-blue-600 dark:bg-blue-500 text-white'
          else if (isFinal) barColor = 'bg-emerald-600 dark:bg-emerald-500 text-white'
          else if (stage.stage.includes('Demo') || stage.stage.includes('Quotation')) barColor = 'bg-[var(--accent)] text-white'

          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">{stage.stage}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-[var(--text-primary)]">{stage.count}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">({stage.conversionFromTotal}% of total)</span>
                </div>
              </div>

              {/* Visual Funnel Bar */}
              <div className="h-6 w-full bg-[var(--bg)] rounded-[var(--radius-sm)] overflow-hidden flex items-center p-0.5 border border-[var(--border)]">
                <div
                  className={`h-full rounded-[4px] ${barColor} flex items-center justify-between px-2.5 transition-all duration-300`}
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-[10px] font-mono font-bold">{stage.count}</span>
                </div>
              </div>

              {/* Step Drop-off Indicator */}
              {idx < data.length - 1 && stage.dropOff > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] pl-2 font-mono">
                  <ArrowDown className="w-3 h-3 text-red-500/70" />
                  <span>{stage.dropOff}% drop-off to next stage</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
