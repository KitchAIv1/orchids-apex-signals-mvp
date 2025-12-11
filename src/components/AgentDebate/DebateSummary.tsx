'use client'

import { cn } from '@/lib/utils'
import { AgentService, type ConsensusLevel } from '@/services/AgentService'
import type { AgentScore } from '@/types/database'

type Props = {
  agents: AgentScore[]
  debateSummary?: string | null
}

export function DebateSummary({ agents, debateSummary }: Props) {
  const consensus = AgentService.identifyConsensusLevel(agents)
  const weightedScore = AgentService.calculateWeightedScore(agents)
  const recommendation = AgentService.getRecommendation(weightedScore)
  const confidence = AgentService.getConfidenceFromConsensus(consensus)
  
  const bullishCount = agents.filter(a => a.score >= 70).length
  const bearishCount = agents.filter(a => a.score < 40).length
  const neutralCount = agents.length - bullishCount - bearishCount
  
  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">Debate Summary</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Consensus</p>
          <p className={cn(
            'text-lg font-bold',
            consensus === 'STRONG' && 'text-emerald-400',
            consensus === 'MODERATE' && 'text-blue-400',
            consensus === 'WEAK' && 'text-amber-400',
            consensus === 'DIVIDED' && 'text-rose-400'
          )}>
            {consensus}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Final Score</p>
          <p className={cn(
            'text-lg font-bold tabular-nums',
            weightedScore >= 70 && 'text-emerald-400',
            weightedScore >= 40 && weightedScore < 70 && 'text-amber-400',
            weightedScore < 40 && 'text-rose-400'
          )}>
            {weightedScore}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Recommendation</p>
          <p className={cn(
            'text-lg font-bold',
            recommendation === 'BUY' && 'text-emerald-400',
            recommendation === 'HOLD' && 'text-amber-400',
            recommendation === 'SELL' && 'text-rose-400'
          )}>
            {recommendation}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Confidence</p>
          <p className={cn(
            'text-lg font-bold',
            confidence === 'HIGH' && 'text-emerald-400',
            confidence === 'MEDIUM' && 'text-amber-400',
            confidence === 'LOW' && 'text-rose-400'
          )}>
            {confidence}
          </p>
        </div>
      </div>
      
      <div className="flex justify-center gap-8 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-zinc-400">{bullishCount} Bullish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-sm text-zinc-400">{neutralCount} Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className="text-sm text-zinc-400">{bearishCount} Bearish</span>
        </div>
      </div>
      
      {debateSummary ? (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
          <p className="text-sm text-zinc-300 leading-relaxed">{debateSummary}</p>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
          <p className="text-sm text-zinc-400 italic">
            Debate summary will be generated during the next analysis cycle based on agent scores and reasoning.
          </p>
        </div>
      )}
    </div>
  )
}
