'use client'

import { Users, Phone, CheckCircle, Clock, ShieldAlert } from 'lucide-react'

interface FreelancerWorkloadItem {
  id: string
  name: string
  status: string
  assignedContacts: number
  interactionsLogged: number
  callsLogged: number
  connectedCalls: number
  connectedRate: number
  unverifiedCalls: number
  followupsOwed: number
}

interface FreelancerWorkloadProps {
  data: FreelancerWorkloadItem[]
}

export function FreelancerWorkloadTable({ data }: FreelancerWorkloadProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-6 text-center text-[var(--text-muted)] text-xs">
        No active freelancer activity recorded.
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Caller Productivity & Workload</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">Assigned load, reachability %, and outstanding follow-ups per freelancer</p>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {data.length} Callers Active
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg)] border-b border-[var(--border-strong)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Freelancer</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Assigned</th>
              <th className="py-2.5 px-3 text-right">Interactions</th>
              <th className="py-2.5 px-3 text-right">Connected %</th>
              <th className="py-2.5 px-3 text-right">Follow-ups Owed</th>
              <th className="py-2.5 px-3 text-right">Unverified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
            {data.map(f => (
              <tr key={f.id} className="hover:bg-[var(--accent-subtle)]/40 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">
                  {f.name}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] border ${
                    f.status === 'APPROVED' || f.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {f.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-medium">
                  {f.assignedContacts}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-medium">
                  {f.interactionsLogged}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  <span className={`font-bold ${
                    f.connectedRate >= 40
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : f.connectedRate > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-[var(--text-muted)]'
                  }`}>
                    {f.connectedRate}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  <span className={`font-semibold ${
                    f.followupsOwed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'
                  }`}>
                    {f.followupsOwed}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--text-muted)]">
                  {f.unverifiedCalls > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{f.unverifiedCalls}</span>
                  ) : (
                    '0'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
