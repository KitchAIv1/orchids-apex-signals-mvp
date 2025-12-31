'use client'

import { cn } from '@/lib/utils'

type Props = {
  score: number
  size?: number
}

export function ScoreRing({ score, size = 40 }: Props) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  // Normalize -100 to +100 scale to 0-100 for the ring visual
  const normalizedScore = ((score + 100) / 200) * 100
  const offset = circumference - (normalizedScore / 100) * circumference
  
  // Use centralized threshold: > +30 = green, < -30 = red, else amber
  const color = score > 30 ? 'text-emerald-400' : score < -30 ? 'text-rose-400' : 'text-amber-400'
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500', color)}
        />
      </svg>
      <span className={cn('absolute text-sm font-bold tabular-nums', color)}>
        {score}
      </span>
    </div>
  )
}
