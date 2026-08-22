'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PhoneCall, ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'

interface ConnectedData {
  connected: number
  notConnected: number
  unknown: number
  unverifiedCount: number
}

interface ConnectedChartProps {
  data: ConnectedData
}

export function ConnectedChart({ data }: ConnectedChartProps) {
  const totalCalls = data.connected + data.notConnected + data.unknown
  const connectRate = totalCalls > 0 ? Math.round((data.connected / totalCalls) * 100) : 0
  const verifiedCount = Math.max(0, totalCalls - data.unverifiedCount)
  const verificationRate = totalCalls > 0 ? Math.round((verifiedCount / totalCalls) * 100) : 0

  const chartData = [
    { name: 'Connected', value: data.connected, color: '#16A34A' },
    { name: 'Not Connected', value: data.notConnected, color: '#DC2626' },
    { name: 'Unspecified', value: data.unknown, color: '#94A3B8' },
  ].filter(d => d.value > 0)

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Call Reachability & Verification</h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Prospect answer rate vs click-to-call verification</p>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {connectRate}%
          </span>
          <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Connect Rate
          </span>
        </div>
      </div>

      {totalCalls === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] my-2">
          No calls logged in this filter period.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-5 h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-bold font-mono text-[var(--text-primary)]">{totalCalls}</span>
              <span className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">Total Calls</span>
            </div>
          </div>

          <div className="sm:col-span-7 space-y-2.5">
            {/* Connected Row */}
            <div className="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-emerald-500/5 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected / Answered</span>
              </div>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {data.connected} ({connectRate}%)
              </span>
            </div>

            {/* Unanswered Row */}
            <div className="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-red-500/5 border border-red-500/20 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-medium">
                <XCircle className="w-3.5 h-3.5" />
                <span>No Answer / Busy</span>
              </div>
              <span className="font-mono font-bold text-red-700 dark:text-red-400">
                {data.notConnected} ({totalCalls > 0 ? Math.round((data.notConnected / totalCalls) * 100) : 0}%)
              </span>
            </div>

            {/* Tap Verification Indicator */}
            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Tap Verified: <strong className="font-mono text-[var(--text-primary)]">{verifiedCount}</strong> / {totalCalls}</span>
              </div>
              <span className="font-mono font-semibold text-[var(--accent)]">{verificationRate}% verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
