'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react'
import { RecommendationBadge } from '@/components/Dashboard/RecommendationBadge'
import { ScoreBadge } from '@/components/Dashboard/ScoreBadge'
import { AgentService } from '@/services/AgentService'
import { reconcileRecommendation } from '@/services/RecommendationEngine'
import { formatDateTime } from '@/utils/formatters'
import type { AnalysisDetail } from '@/services/StockAnalysisService'

type Props = {
  analysis: AnalysisDetail
}

function buildExplainerText(
  agentScores: AnalysisDetail['agentScores'],
  recommendation: string,
  confidence: string,
  hasDeviation: boolean
): string {
  if (agentScores.length === 0) return 'Awaiting agent analysis...'

  // Agent scores: -100 to +100 scale
  const bullish = agentScores.filter(a => a.score > 0)
  const bearish = agentScores.filter(a => a.score < 0)
  const extremeBearish = agentScores.find(a => a.score <= -50)
  const extremeBullish = agentScores.find(a => a.score >= 50)

  if (hasDeviation && extremeBearish) {
    const agentInfo = AgentService.getAgentInfo(extremeBearish.agent_name)
    return `${agentInfo.displayName} concerns override positive signals`
  }

  if (confidence === 'LOW') {
    return 'Agents divided - proceed with caution'
  }

  if (recommendation === 'BUY' && extremeBullish) {
    return 'Strong conviction from multiple agents'
  }

  if (recommendation === 'SELL' && extremeBearish) {
    const agentInfo = AgentService.getAgentInfo(extremeBearish.agent_name)
    return `${agentInfo.displayName} signals significant risk`
  }

  if (bullish.length > bearish.length) {
    return 'Majority of agents lean positive'
  }

  if (bearish.length > bullish.length) {
    return 'Majority of agents express concerns'
  }

  return 'Balanced signals across agents'
}

export function StockOverview({ analysis }: Props) {
  const { ticker, company_name, sector, prediction, agentScores } = analysis
  
  const calculatedScore = agentScores.length > 0 
    ? AgentService.calculateWeightedScore(agentScores)
    : prediction?.final_score ?? 0
  
  const recommendation = prediction?.recommendation 
    ?? AgentService.getRecommendation(calculatedScore)
  
  const consensus = agentScores.length > 0 
    ? AgentService.identifyConsensusLevel(agentScores) 
    : null
    
  const confidence = consensus 
    ? AgentService.getConfidenceFromConsensus(consensus)
    : prediction?.confidence ?? 'MEDIUM'
    
  const holdingPeriod = prediction?.holding_period ?? '2-4 weeks'
  const lastUpdated = prediction?.predicted_at 
    ?? agentScores[0]?.timestamp 
    ?? null

  // Check for deviation
  const reconciliation = prediction?.recommendation 
    ? reconcileRecommendation(calculatedScore, prediction.recommendation)
    : null
  const hasDeviation = reconciliation?.hasDeviation ?? false
  
  const explainerText = buildExplainerText(
    agentScores, 
    recommendation, 
    confidence, 
    hasDeviation
  )

  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">{ticker}</h1>
            {sector && (
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {sector}
              </span>
            )}
          </div>
          <p className="text-zinc-500 mt-1">{company_name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RecommendationBadge recommendation={recommendation} />
          <p className="text-xs text-zinc-500 text-right max-w-[180px]">
            {explainerText}
          </p>
          {hasDeviation && (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px]">Score suggests {reconciliation?.calculatedRecommendation}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-zinc-800/30 p-4">
          <p className="text-xs text-zinc-500 mb-1">Consensus Score</p>
          <ScoreBadge score={calculatedScore} showLabel />
        </div>
        <div className="rounded-lg bg-zinc-800/30 p-4">
          <p className="text-xs text-zinc-500 mb-1">Confidence</p>
          <p className="text-xl font-bold text-zinc-100">{confidence}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/30 p-4">
          <p className="text-xs text-zinc-500 mb-1">Holding Period</p>
          <p className="text-xl font-bold text-zinc-100">{holdingPeriod}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/30 p-4">
          <p className="text-xs text-zinc-500 mb-1">Last Updated</p>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-sm">{lastUpdated ? formatDateTime(lastUpdated) : 'Pending'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
