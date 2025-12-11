'use client'

import { cn } from '@/lib/utils'
import { getRecommendationColor } from '@/utils/formatters'

type Props = {
  recommendation: string | null | undefined
  size?: 'sm' | 'md'
}

export function RecommendationBadge({ recommendation, size = 'md' }: Props) {
  const rec = recommendation || 'HOLD'
  const colorClass = getRecommendationColor(rec)
  
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold uppercase tracking-wider',
        colorClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {rec}
    </span>
  )
}
