'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, GitCommit, AlertCircle } from 'lucide-react'
import type { RecommendationHistory } from '@/types/database'
import { getRecommendationColor } from '@/utils/formatters'

type Props = {
  changes: RecommendationHistory[]
  currentRecommendation?: string
  currentScore?: number
}

type JourneyStep = {
  recommendation: string
  score: number
  reason: string | null
  date: Date
  scoreChange: number
  isCurrent: boolean
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTrendLabel(changes: JourneyStep[]): { label: string; color: string } {
  if (changes.length < 2) return { label: 'NEW', color: 'text-blue-400' }
  
  const recentChanges = changes.slice(0, 3)
  const netChange = recentChanges.reduce((sum, c) => sum + c.scoreChange, 0)
  
  if (Math.abs(netChange) < 5) return { label: 'STABLE', color: 'text-zinc-400' }
  if (netChange > 15) return { label: 'IMPROVING', color: 'text-emerald-400' }
  if (netChange > 5) return { label: 'RISING', color: 'text-emerald-400' }
  if (netChange < -15) return { label: 'DECLINING', color: 'text-rose-400' }
  if (netChange < -5) return { label: 'FALLING', color: 'text-rose-400' }
  return { label: 'VOLATILE', color: 'text-amber-400' }
}

export function RecommendationJourney({ 
  changes, 
  currentRecommendation,
  currentScore 
}: Props) {
  if (changes.length === 0 && !currentRecommendation) return null

  const journeySteps: JourneyStep[] = changes.slice(0, 5).map((change, idx) => ({
    recommendation: change.new_recommendation,
    score: change.new_score,
    reason: change.change_reason,
    date: new Date(change.changed_at),
    scoreChange: (change.new_score ?? 0) - (change.previous_score ?? 0),
    isCurrent: idx === 0
  }))

  // Add current state if different from most recent change
  if (currentRecommendation && currentScore !== undefined) {
    const latestChange = journeySteps[0]
    if (!latestChange || latestChange.recommendation !== currentRecommendation) {
      journeySteps.unshift({
        recommendation: currentRecommendation,
        score: currentScore,
        reason: 'Current analysis',
        date: new Date(),
        scoreChange: latestChange ? currentScore - latestChange.score : 0,
        isCurrent: true
      })
      if (journeySteps.length > 5) journeySteps.pop()
    }
  }

  const trend = getTrendLabel(journeySteps)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Recommendation Journey</h3>
        </div>
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded", trend.color, 
          trend.color.includes('emerald') && 'bg-emerald-500/10',
          trend.color.includes('rose') && 'bg-rose-500/10',
          trend.color.includes('amber') && 'bg-amber-500/10',
          trend.color.includes('zinc') && 'bg-zinc-500/10',
          trend.color.includes('blue') && 'bg-blue-500/10'
        )}>
          {trend.label}
        </span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-zinc-700" />

        <div className="space-y-3">
          {journeySteps.map((step, idx) => {
            const recColor = getRecommendationColor(step.recommendation)
            const ChangeIcon = step.scoreChange > 0 
              ? TrendingUp 
              : step.scoreChange < 0 
                ? TrendingDown 
                : Minus
            const changeColor = step.scoreChange > 0 
              ? 'text-emerald-400' 
              : step.scoreChange < 0 
                ? 'text-rose-400' 
                : 'text-zinc-500'

            return (
              <div key={idx} className="relative flex items-start gap-3 pl-6">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-900",
                  step.isCurrent 
                    ? "bg-violet-500 ring-2 ring-violet-500/30" 
                    : "bg-zinc-700"
                )} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      recColor
                    )}>
                      {step.recommendation}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      Score: {step.score}
                    </span>
                    {step.scoreChange !== 0 && (
                      <span className={cn('flex items-center gap-0.5 text-[10px]', changeColor)}>
                        <ChangeIcon className="h-3 w-3" />
                        {step.scoreChange > 0 ? '+' : ''}{step.scoreChange.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600">
                      {formatRelativeTime(step.date)}
                    </span>
                  </div>
                  
                  {step.reason && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {step.reason}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {journeySteps.length >= 3 && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              {trend.label === 'VOLATILE' 
                ? 'Frequent changes indicate high uncertainty'
                : trend.label === 'IMPROVING'
                  ? 'Positive momentum building over time'
                  : trend.label === 'DECLINING'
                    ? 'Negative pressure mounting'
                    : 'Track record helps inform confidence level'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

