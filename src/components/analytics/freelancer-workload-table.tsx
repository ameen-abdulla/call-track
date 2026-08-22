'use client'

import { UserCheck, ShieldAlert, PhoneCall, CheckCircle2 } from 'lucide-react'

interface FreelancerWorkload {
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
  data: FreelancerWorkload[]
}

export function FreelancerWorkloadTable({ data }: FreelancerWorkloadProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        No freelancer data available.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Freelancer Workload & Productivity</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Caller activity, connect rates, follow-ups, and verification</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-medium">
              <th className="py-2.5 px-3">Freelancer</th>
              <th className="py-2.5 px-3">Assigned Leads</th>
              <th className="py-2.5 px-3">Calls Made</th>
              <th className="py-2.5 px-3">Connected</th>
              <th className="py-2.5 px-3">Connect Rate</th>
              <th className="py-2.5 px-3">Follow-ups Owed</th>
              <th className="py-2.5 px-3">Unverified Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {data.map(f => (
              <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>{f.name}</span>
                </td>
                <td className="py-3 px-3 font-medium text-gray-700 dark:text-gray-300">{f.assignedContacts}</td>
                <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{f.callsLogged}</td>
                <td className="py-3 px-3 text-green-600 dark:text-green-400 font-medium">{f.connectedCalls}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          f.connectedRate >= 50 ? 'bg-green-500' : f.connectedRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, f.connectedRate)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{f.connectedRate}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    f.followupsOwed > 0
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {f.followupsOwed}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {f.unverifiedCalls > 0 ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {f.unverifiedCalls}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All verified
                    </span>
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
