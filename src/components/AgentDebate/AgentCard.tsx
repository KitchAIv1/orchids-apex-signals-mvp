'use client'

import { cn } from '@/lib/utils'
import { AgentService, type AgentDisplayInfo } from '@/services/AgentService'
import type { AgentScore } from '@/types/database'

type Props = {
  agent: AgentScore
  info: AgentDisplayInfo
  isSelected: boolean
  onSelect: () => void
}

export function AgentCard({ agent, info, isSelected, onSelect }: Props) {
  const scoreLabel = AgentService.getScoreLabel(agent.score)
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
        'hover:scale-[1.02] hover:shadow-lg',
        isSelected 
          ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10' 
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
      )}
    >
      <span className="text-2xl">{info.icon}</span>
      <span className="text-xs font-medium text-zinc-400 text-center leading-tight">
        {info.displayName}
      </span>
      <div className="mt-1 flex flex-col items-center">
        <span className={cn(
          'text-2xl font-bold tabular-nums',
          agent.score >= 70 && 'text-emerald-400',
          agent.score >= 40 && agent.score < 70 && 'text-amber-400',
          agent.score < 40 && 'text-rose-400'
        )}>
          {agent.score}
        </span>
        <span className={cn(
          'text-xs font-medium uppercase tracking-wide',
          scoreLabel === 'BULLISH' && 'text-emerald-400',
          scoreLabel === 'NEUTRAL' && 'text-amber-400',
          scoreLabel === 'BEARISH' && 'text-rose-400'
        )}>
          {scoreLabel}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            agent.score >= 70 && 'bg-emerald-500',
            agent.score >= 40 && agent.score < 70 && 'bg-amber-500',
            agent.score < 40 && 'bg-rose-500'
          )}
          style={{ width: `${agent.score}%` }}
        />
      </div>
    </button>
  )
}
