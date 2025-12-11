'use client'

import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { RecommendationBadge } from '@/components/Dashboard/RecommendationBadge'
import { ScoreBadge } from '@/components/Dashboard/ScoreBadge'
import { AgentService } from '@/services/AgentService'
import { formatDateTime } from '@/utils/formatters'
import type { AnalysisDetail } from '@/services/StockAnalysisService'

type Props = {
  analysis: AnalysisDetail
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
        <RecommendationBadge recommendation={recommendation} />
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
