'use client'

import { cn } from '@/lib/utils'

type Props = {
  confidence: string
}

export function ConfidenceBar({ confidence }: Props) {
  const confidenceMap: Record<string, number> = {
    'HIGH': 100,
    'MEDIUM': 60,
    'LOW': 30
  }
  const value = confidenceMap[confidence] || 50
  const color = confidence === 'HIGH' ? 'bg-emerald-500' : confidence === 'MEDIUM' ? 'bg-amber-500' : 'bg-rose-500'
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-zinc-800 overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-medium',
        confidence === 'HIGH' ? 'text-emerald-400' : confidence === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400'
      )}>
        {confidence}
      </span>
    </div>
  )
}
