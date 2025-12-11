'use client'

import { Zap, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, getRecommendationColor } from '@/utils/formatters'
import type { CatalystUpdate } from '@/services/RecommendationHistoryService'

type Props = {
  catalysts: CatalystUpdate[]
  maxItems?: number
}

function CatalystTimelineItem({ catalyst }: { catalyst: CatalystUpdate }) {
  const timeAgo = formatDistanceToNow(catalyst.changed_at)
  const isPositive = catalyst.isUpgrade
  const scoreDelta = catalyst.scoreChange.toFixed(1)

  return (
    <div className="flex gap-3 py-2.5 border-b border-zinc-800/50 last:border-b-0">
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
          isPositive ? 'bg-emerald-500/15' : 'bg-rose-500/15'
        )}
      >
        <Zap className={cn('h-3.5 w-3.5', isPositive ? 'text-emerald-400' : 'text-rose-400')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase', getRecommendationColor(catalyst.previous_recommendation ?? ''))}>
            {catalyst.previous_recommendation ?? '—'}
          </span>
          <ArrowRight className="h-3 w-3 text-zinc-600" />
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase', getRecommendationColor(catalyst.new_recommendation))}>
            {catalyst.new_recommendation}
          </span>
          <span className={cn('text-[10px] font-medium', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {isPositive ? '+' : ''}{scoreDelta} pts
          </span>
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-400/60" />
          ) : (
            <TrendingDown className="h-3 w-3 text-rose-400/60" />
          )}
        </div>
        {catalyst.change_reason && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{catalyst.change_reason}</p>
        )}
        <span className="text-[10px] text-zinc-600 mt-0.5 block">{timeAgo}</span>
      </div>
    </div>
  )
}

export function CatalystTimeline({ catalysts, maxItems = 5 }: Props) {
  const visibleCatalysts = catalysts.slice(0, maxItems)

  if (visibleCatalysts.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-amber-400" />
        Recent Events
      </h4>
      <div className="divide-y divide-zinc-800/50">
        {visibleCatalysts.map(catalyst => (
          <CatalystTimelineItem key={catalyst.id} catalyst={catalyst} />
        ))}
      </div>
    </div>
  )
}
