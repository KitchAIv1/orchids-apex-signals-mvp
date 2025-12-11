'use client'

import { useState, useMemo } from 'react'
import { useAgentAnalysis } from '@/hooks/useAgentAnalysis'
import { Navbar } from '@/components/shared/Navbar'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { StockOverview } from './StockOverview'
import { RiskFactorsList } from './RiskFactorsList'
import { AgentDebateRoom } from '@/components/AgentDebate/AgentDebateRoom'
import { ConflictSummary } from '@/components/AgentDebate/ConflictSummary'
import { RecommendationJourney } from '@/components/shared/RecommendationJourney'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AgentService } from '@/services/AgentService'
import { reconcileRecommendation } from '@/services/RecommendationEngine'

type Props = {
  ticker: string
}

export function StockDetailClient({ ticker }: Props) {
  const { analysis, loading, error, refetch } = useAgentAnalysis(ticker)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Calculate recommendation and deviation info
  const calculatedScore = useMemo(() => {
    if (!analysis?.agentScores?.length) return analysis?.prediction?.final_score ?? 0
    return AgentService.calculateWeightedScore(analysis.agentScores)
  }, [analysis])

  const recommendation = analysis?.prediction?.recommendation 
    ?? AgentService.getRecommendation(calculatedScore)

  const reconciliation = useMemo(() => {
    if (!analysis?.prediction?.recommendation) return null
    return reconcileRecommendation(calculatedScore, analysis.prediction.recommendation)
  }, [calculatedScore, analysis?.prediction?.recommendation])

  const handleRunAnalysis = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch(`/api/analyze/${ticker}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }
      refetch()
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">{ticker}</h1>
          <Button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </>
            ) : (
              'Run AI Analysis'
            )}
          </Button>
        </div>

        {analyzeError && (
          <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
            {analyzeError}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-[200px] rounded-xl bg-zinc-800/50" />
            <Skeleton className="h-[400px] rounded-xl bg-zinc-800/50" />
          </div>
        ) : error || !analysis ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
            <p className="text-rose-400">{error || 'Stock not found'}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <StockOverview analysis={analysis} />
            
            {/* Conflict Summary - Shows bull vs bear at a glance */}
            {analysis.agentScores.length > 0 && (
              <ConflictSummary 
                agents={analysis.agentScores}
                recommendation={recommendation}
                hasDeviation={reconciliation?.hasDeviation}
                calculatedRecommendation={reconciliation?.calculatedRecommendation}
              />
            )}
            
            <AgentDebateRoom 
              agents={analysis.agentScores} 
              debateSummary={analysis.prediction?.debate_summary}
              storedRecommendation={analysis.prediction?.recommendation}
            />
            
            {/* Recommendation Journey - Shows how we got here */}
            <RecommendationJourney 
              changes={analysis.recommendationChanges}
              currentRecommendation={recommendation}
              currentScore={calculatedScore}
            />
            
            <RiskFactorsList risks={analysis.prediction?.risk_factors} />
            <DisclaimerBanner />
          </div>
        )}
      </main>
    </div>
  )
}