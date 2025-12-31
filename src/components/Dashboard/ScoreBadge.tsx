'use client'

import { cn } from '@/lib/utils'
import { getScoreColor, getScoreBgColor } from '@/utils/formatters'
import { getScoreLabel } from '@/services/RecommendationEngine'

type Props = {
  score: number | null | undefined
  showLabel?: boolean
}

export function ScoreBadge({ score, showLabel = false }: Props) {
  const displayScore = score ?? 0
  const colorClass = getScoreColor(displayScore)
  const bgClass = getScoreBgColor(displayScore)
  
  // Use centralized threshold logic: > +30 = Bullish, < -30 = Bearish, else Neutral
  const label = getScoreLabel(displayScore)
  
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5', bgClass)}>
      <span className={cn('text-xl font-bold tabular-nums', colorClass)}>
        {displayScore}
      </span>
      {showLabel && (
        <span className={cn('text-xs font-medium uppercase tracking-wide', colorClass)}>
          {label}
        </span>
      )}
    </div>
  )
}
