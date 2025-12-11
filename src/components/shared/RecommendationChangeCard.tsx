'use client'

import { cn } from '@/lib/utils'
import { ArrowRight, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import type { RecommendationHistory } from '@/types/database'
import { getRecommendationColor } from '@/utils/formatters'

type Props = {
  changes: RecommendationHistory[]
}

function formatChangeDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getScoreChangeDisplay(prev: number | null, curr: number) {
  if (!prev) return null
  const diff = curr - prev
  const sign = diff > 0 ? '+' : ''
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  const colorClass = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-zinc-400'
  
  return (
    <span className={cn('flex items-center gap-1 text-xs', colorClass)}>
      <Icon className="h-3 w-3" />
      {sign}{diff.toFixed(1)}
    </span>
  )
}

export function RecommendationChangeCard({ changes }: Props) {
  if (changes.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-zinc-200">What Changed</h3>
      </div>
      
      <div className="space-y-2">
        {changes.slice(0, 3).map((change) => {
          const prevColor = change.previous_recommendation 
            ? getRecommendationColor(change.previous_recommendation) 
            : 'text-zinc-500 bg-zinc-500/10'
          const newColor = getRecommendationColor(change.new_recommendation)
          
          return (
            <div
              key={change.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {change.previous_recommendation ? (
                    <>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', prevColor)}>
                        {change.previous_recommendation}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </>
                  ) : null}
                  <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', newColor)}>
                    {change.new_recommendation}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {getScoreChangeDisplay(change.previous_score, change.new_score)}
                  <span className="text-[10px] text-zinc-500">
                    {formatChangeDate(change.changed_at)}
                  </span>
                </div>
              </div>
              
              {change.change_reason && (
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                  {change.change_reason}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
