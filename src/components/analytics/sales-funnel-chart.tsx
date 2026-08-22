'use client'

import { ArrowDown, TrendingUp } from 'lucide-react'

interface FunnelStage {
  stage: string
  count: number
  dropOff: number
  conversionFromTotal: number
}

interface SalesFunnelProps {
  data: FunnelStage[]
}

const STAGE_COLORS = [
  'bg-blue-600 dark:bg-blue-500',
  'bg-indigo-600 dark:bg-indigo-500',
  'bg-sky-600 dark:bg-sky-500',
  'bg-teal-600 dark:bg-teal-500',
  'bg-emerald-600 dark:bg-emerald-500',
  'bg-amber-600 dark:bg-amber-500',
  'bg-green-600 dark:bg-green-500',
]

export function SalesFunnelChart({ data }: SalesFunnelProps) {
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Sales Conversion Funnel</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prospect journey from discovery to won conversion</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-xl border border-green-200 dark:border-green-800">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{data[data.length - 1]?.conversionFromTotal ?? 0}% Win Rate</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((stage, idx) => {
          const widthPercent = Math.max(10, Math.round((stage.count / maxCount) * 100))
          const color = STAGE_COLORS[idx % STAGE_COLORS.length]

          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-gray-800 dark:text-gray-200">{stage.stage}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 dark:text-white">{stage.count}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 w-16 text-right">
                    ({stage.conversionFromTotal}%)
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-800 h-6 rounded-xl overflow-hidden p-0.5 relative flex items-center">
                <div
                  className={`h-full rounded-lg transition-all duration-500 flex items-center px-2 ${color}`}
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-[11px] font-bold text-white tracking-wide truncate">
                    {stage.count > 0 ? stage.count : ''}
                  </span>
                </div>
              </div>

              {idx < data.length - 1 && stage.dropOff > 0 && (
                <div className="flex items-center justify-end text-[10px] text-red-500 dark:text-red-400 pr-2">
                  <ArrowDown className="w-3 h-3 inline" />
                  <span>-{stage.dropOff}% drop-off</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
