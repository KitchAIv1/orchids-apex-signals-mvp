'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string
  icon: LucideIcon
  change?: number
  subtext?: string
  highlight?: boolean
}

export function PortfolioStatCard({ label, value, icon: Icon, change, subtext, highlight }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className={cn('h-5 w-5', highlight ? 'text-emerald-400' : 'text-zinc-500')} />
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-100">{value}</p>
      {change !== undefined && (
        <p className={cn('mt-1 text-sm font-medium', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}% return
        </p>
      )}
      {subtext && <p className="mt-1 text-sm text-zinc-500">{subtext}</p>}
    </div>
  )
}

