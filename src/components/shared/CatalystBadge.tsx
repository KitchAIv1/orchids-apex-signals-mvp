'use client'

import { Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/utils/formatters'
import type { CatalystUpdate } from '@/services/RecommendationHistoryService'

type Props = {
  catalyst: CatalystUpdate
  compact?: boolean
}

export function CatalystBadge({ catalyst, compact = false }: Props) {
  const timeAgo = formatDistanceToNow(catalyst.changed_at)
  const scoreDelta = catalyst.scoreChange.toFixed(1)
  const isPositive = catalyst.isUpgrade

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
          isPositive
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
            : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
        )}
        title={`${catalyst.change_reason ?? 'Score updated'} • ${timeAgo}`}
      >
        <Zap className="h-2.5 w-2.5" />
        Updated
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs',
        isPositive
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : 'bg-rose-500/10 border border-rose-500/20'
      )}
    >
      <Zap className={cn('h-3.5 w-3.5', isPositive ? 'text-emerald-400' : 'text-rose-400')} />
      <div className="flex flex-col">
        <span className={cn('font-medium', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
          {isPositive ? '+' : ''}{scoreDelta} pts
        </span>
        <span className="text-zinc-500 text-[10px]">{timeAgo}</span>
      </div>
      {isPositive ? (
        <TrendingUp className="h-3 w-3 text-emerald-400/60" />
      ) : (
        <TrendingDown className="h-3 w-3 text-rose-400/60" />
      )}
    </div>
  )
}
