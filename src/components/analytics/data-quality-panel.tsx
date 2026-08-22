'use client'

import { ShieldCheck, AlertCircle, PhoneOff, FileQuestion, MailWarning, ShieldAlert } from 'lucide-react'

interface DataQualityData {
  neverCalledCount: number
  noResponseCount: number
  missingPhoneOrEmail: number
  unverifiedCallLogs: number
}

interface DataQualityPanelProps {
  data: DataQualityData
}

export function DataQualityPanel({ data }: DataQualityPanelProps) {
  const issues = [
    {
      label: 'Prospects Never Called',
      count: data.neverCalledCount,
      icon: PhoneOff,
      description: 'Prospects in database with zero call or interaction attempts',
      level: data.neverCalledCount > 0 ? 'warning' : 'good',
    },
    {
      label: 'Missing Phone or Email',
      count: data.missingPhoneOrEmail,
      icon: MailWarning,
      description: 'Records missing either primary phone or email address',
      level: data.missingPhoneOrEmail > 0 ? 'info' : 'good',
    },
    {
      label: 'Calls Missing Response',
      count: data.noResponseCount,
      icon: FileQuestion,
      description: 'Interacted contacts with no standard response lookup logged',
      level: data.noResponseCount > 0 ? 'warning' : 'good',
    },
    {
      label: 'Unverified Call Logs',
      count: data.unverifiedCallLogs,
      icon: ShieldAlert,
      description: 'Calls logged without click-to-call tap verification signal',
      level: data.unverifiedCallLogs > 0 ? 'alert' : 'good',
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">Data Quality & Verification Health</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Database hygiene, missing fields, and call verification integrity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {issues.map(issue => {
          const Icon = issue.icon
          const isGood = issue.count === 0
          return (
            <div
              key={issue.label}
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isGood
                  ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/60'
                  : issue.level === 'alert'
                  ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                  : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{issue.label}</span>
                  <Icon className={`w-4 h-4 ${isGood ? 'text-green-500' : issue.level === 'alert' ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{issue.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">Count:</span>
                <span className={`text-base font-bold ${
                  isGood ? 'text-green-600 dark:text-green-400' : issue.level === 'alert' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {issue.count}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
