'use client'

import { cn } from '@/lib/utils'
import type { AgentScore } from '@/types/database'

const AGENT_LABELS: Record<string, string> = {
  fundamental: 'Financials',
  technical: 'Technicals',
  sentiment: 'Sentiment',
  macro: 'Macro',
  insider: 'Insider',
  catalyst: 'Catalysts'
}

type Props = {
  agent: AgentScore
}

export function AgentScoreBar({ agent }: Props) {
  const normalizedScore = ((agent.score + 100) / 200) * 100
  const barColor = agent.score > 30 ? 'bg-emerald-500'
    : agent.score < -30 ? 'bg-rose-500'
    : agent.score > 0 ? 'bg-amber-500'
    : agent.score < 0 ? 'bg-orange-500'
    : 'bg-zinc-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{AGENT_LABELS[agent.agent_name] || agent.agent_name}</span>
        <span className={cn(
          'font-mono font-medium',
          agent.score > 0 ? 'text-emerald-400' : agent.score < 0 ? 'text-rose-400' : 'text-zinc-400'
        )}>
          {agent.score > 0 ? '+' : ''}{agent.score}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, Math.max(0, normalizedScore))}%` }}
        />
      </div>
    </div>
  )
}

