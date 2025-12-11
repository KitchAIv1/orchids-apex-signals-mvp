'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react'
import { AgentService, AGENT_INFO } from '@/services/AgentService'
import type { AgentScore } from '@/types/database'

type Props = {
  agents: AgentScore[]
  recommendation: string
  hasDeviation?: boolean
  calculatedRecommendation?: string
}

type ConflictCase = {
  agentName: string
  icon: string
  score: number
  keyPoint: string
}

function getKeyPointFromScore(agentName: string, score: number): string {
  const info = AGENT_INFO[agentName as keyof typeof AGENT_INFO]
  const stance = score >= 50 ? 'positive' : 'negative'
  
  const keyPoints: Record<string, Record<string, string>> = {
    fundamental: {
      positive: 'Strong financials and growth metrics',
      negative: 'Valuation concerns or weak fundamentals'
    },
    technical: {
      positive: 'Bullish chart patterns and momentum',
      negative: 'Bearish technical signals'
    },
    sentiment: {
      positive: 'Strong analyst ratings and market buzz',
      negative: 'Negative sentiment and downgrades'
    },
    macro: {
      positive: 'Favorable economic conditions',
      negative: 'Macro headwinds affecting outlook'
    },
    insider: {
      positive: 'Insider buying signals confidence',
      negative: 'Notable insider selling activity'
    },
    catalyst: {
      positive: 'Positive catalysts on horizon',
      negative: 'Potential negative catalysts ahead'
    }
  }
  
  return keyPoints[agentName]?.[stance] || `${info?.displayName || agentName}: Score ${score}`
}

function buildExplainer(
  bullishAgents: ConflictCase[],
  bearishAgents: ConflictCase[],
  recommendation: string,
  hasDeviation: boolean
): string {
  if (bullishAgents.length === 0 && bearishAgents.length === 0) {
    return 'Awaiting agent analysis...'
  }
  
  const dominantBearish = bearishAgents.find(a => a.score <= -50)
  const dominantBullish = bullishAgents.find(a => a.score >= 80)
  
  if (hasDeviation) {
    if (dominantBearish) {
      return `${dominantBearish.keyPoint} is creating uncertainty despite positive signals`
    }
    return 'Conflicting signals between agents; proceed with caution'
  }
  
  if (recommendation === 'BUY' && dominantBullish) {
    return `${dominantBullish.keyPoint} driving bullish outlook`
  }
  
  if (recommendation === 'SELL' && dominantBearish) {
    return `${dominantBearish.keyPoint} signals caution`
  }
  
  if (recommendation === 'HOLD') {
    if (bullishAgents.length > 0 && bearishAgents.length > 0) {
      return 'Mixed signals from agents; neutral stance recommended'
    }
    return 'Balanced outlook with no strong conviction either way'
  }
  
  return 'Analysis complete with mixed signals'
}

export function ConflictSummary({ 
  agents, 
  recommendation, 
  hasDeviation,
  calculatedRecommendation 
}: Props) {
  const bullishAgents: ConflictCase[] = agents
    .filter(a => a.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(a => ({
      agentName: a.agent_name,
      icon: AGENT_INFO[a.agent_name as keyof typeof AGENT_INFO]?.icon || '🤖',
      score: a.score,
      keyPoint: getKeyPointFromScore(a.agent_name, a.score)
    }))

  const bearishAgents: ConflictCase[] = agents
    .filter(a => a.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(a => ({
      agentName: a.agent_name,
      icon: AGENT_INFO[a.agent_name as keyof typeof AGENT_INFO]?.icon || '🤖',
      score: a.score,
      keyPoint: getKeyPointFromScore(a.agent_name, a.score)
    }))

  const explainer = buildExplainer(
    bullishAgents, 
    bearishAgents, 
    recommendation, 
    hasDeviation ?? false
  )
  
  const totalBullishWeight = bullishAgents.reduce((sum, a) => sum + Math.abs(a.score), 0)
  const totalBearishWeight = bearishAgents.reduce((sum, a) => sum + Math.abs(a.score), 0)
  const totalWeight = totalBullishWeight + totalBearishWeight
  const bullishPct = totalWeight > 0 ? (totalBullishWeight / totalWeight) * 100 : 50
  
  const isDivided = bullishAgents.length > 0 && bearishAgents.length > 0

  if (agents.length === 0) return null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Key Conflict</h3>
        {isDivided && (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-400 font-medium">
            DIVIDED
          </span>
        )}
      </div>

      {/* Tug of War Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>BULLS</span>
          <span>BEARS</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${bullishPct}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-rose-400 to-rose-500"
            style={{ width: `${100 - bullishPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Bullish Case */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Bullish Case</span>
          </div>
          {bullishAgents.length > 0 ? (
            <ul className="space-y-1.5">
              {bullishAgents.map(agent => (
                <li key={agent.agentName} className="flex items-start gap-1.5">
                  <span className="text-sm">{agent.icon}</span>
                  <span className="text-xs text-zinc-400 leading-tight">
                    {agent.keyPoint}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600 italic">No strong bullish signals</p>
          )}
        </div>

        {/* Bearish Case */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Bearish Case</span>
          </div>
          {bearishAgents.length > 0 ? (
            <ul className="space-y-1.5">
              {bearishAgents.map(agent => (
                <li key={agent.agentName} className="flex items-start gap-1.5">
                  <span className="text-sm">{agent.icon}</span>
                  <span className="text-xs text-zinc-400 leading-tight">
                    {agent.keyPoint}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600 italic">No strong bearish signals</p>
          )}
        </div>
      </div>

      {/* Explainer */}
      <div className={cn(
        "rounded-lg p-3 border",
        hasDeviation 
          ? "bg-amber-500/5 border-amber-500/20" 
          : "bg-zinc-800/30 border-zinc-700/50"
      )}>
        <div className="flex items-start gap-2">
          {hasDeviation && (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm text-zinc-300">{explainer}</p>
            {hasDeviation && calculatedRecommendation && (
              <p className="text-[10px] text-amber-400 mt-1">
                Note: Score suggests {calculatedRecommendation}, AI chose {recommendation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

