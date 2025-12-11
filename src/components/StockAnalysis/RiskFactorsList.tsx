'use client'

import { AlertTriangle } from 'lucide-react'

type Props = {
  risks: string[] | null | undefined
}

const DEFAULT_RISKS = [
  'Market volatility and overall economic conditions',
  'Sector-specific regulatory changes',
  'Earnings expectations vs actual results',
  'Interest rate sensitivity'
]

export function RiskFactorsList({ risks }: Props) {
  const displayRisks = risks && risks.length > 0 ? risks : DEFAULT_RISKS

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-zinc-100">Risk Factors</h3>
      </div>
      <ul className="space-y-2">
        {displayRisks.map((risk, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/50" />
            {risk}
          </li>
        ))}
      </ul>
    </div>
  )
}
