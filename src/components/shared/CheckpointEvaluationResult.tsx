'use client'

import { cn } from '@/lib/utils'
import { Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { CheckpointEvaluation } from '@/types/database'

type Props = {
  evaluation: CheckpointEvaluation
  label: string
  isPrimary?: boolean
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function CheckpointEvaluationResult({ evaluation, label, isPrimary = false }: Props) {
  const { directionalAccuracy, returnPct, direction } = evaluation

  return (
    <div className={cn(
      'mt-3 pt-3 border-t border-zinc-800/50',
      isPrimary && 'bg-violet-500/5 -mx-4 px-4 py-3 rounded-lg border border-violet-500/20'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-medium',
            directionalAccuracy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          )}>
            {directionalAccuracy ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {directionalAccuracy ? 'Correct' : 'Incorrect'}
          </div>
          <span className="text-xs text-zinc-500">
            {label} • Moved {direction}
          </span>
        </div>
        
        <div className={cn(
          'flex items-center gap-1 text-sm font-semibold tabular-nums',
          returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {returnPct >= 0 ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {formatPercent(returnPct)}
        </div>
      </div>
    </div>
  )
}
