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
  variant?: 'default' | 'primary'
}

export function PortfolioStatCard({ 
  label, 
  value, 
  icon: Icon, 
  change, 
  subtext, 
  highlight,
  variant = 'default' 
}: Props) {
  const isPrimary = variant === 'primary'

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all duration-300 h-full flex flex-col justify-between",
      isPrimary 
        ? "bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-amber-500/20 shadow-lg shadow-amber-900/5" 
        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-sm font-medium",
          isPrimary ? "text-zinc-300" : "text-zinc-400"
        )}>
          {label}
        </span>
        <div className={cn(
          "p-2 rounded-lg",
          isPrimary ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800/50 text-zinc-500"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className={cn(
          "font-bold tracking-tight",
          isPrimary ? "text-3xl text-white" : "text-2xl text-zinc-100"
        )}>
          {value}
        </p>
        
        {(change !== undefined || subtext) && (
          <div className="flex items-center gap-2">
            {change !== undefined && (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                change >= 0 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "bg-rose-500/10 text-rose-400"
              )}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            )}
            {subtext && (
              <span className="text-xs text-zinc-500">{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
