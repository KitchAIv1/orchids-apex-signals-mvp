'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'
import { AgentScoreBar } from './AgentScoreBar'
import { ConvictionRating } from './ConvictionRating'
import type { AgentScore } from '@/types/database'

type StockAnalysis = {
  finalScore: number | null
  riskFactors: string[]
  debateSummary: string | null
  agentScores: AgentScore[]
}

type Props = {
  ticker: string | null
  stockId: string | null
}

export function IndicatorPanel({ ticker, stockId }: Props) {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stockId) fetchAnalysis(stockId)
  }, [stockId])

  async function fetchAnalysis(sid: string) {
    setLoading(true)

    const { data: prediction } = await supabase
      .from('predictions')
      .select('final_score, risk_factors, debate_summary')
      .eq('stock_id', sid)
      .order('predicted_at', { ascending: false })
      .limit(1)
      .single()

    const { data: scores } = await supabase
      .from('agent_scores')
      .select('*')
      .eq('stock_id', sid)
      .order('timestamp', { ascending: false })
      .limit(6)

    setAnalysis({
      finalScore: prediction?.final_score || null,
      riskFactors: prediction?.risk_factors || [],
      debateSummary: prediction?.debate_summary || null,
      agentScores: (scores as AgentScore[]) || []
    })
    setLoading(false)
  }

  if (!ticker) {
    return (
      <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Select a stock</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading analysis...</p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
      <ConvictionRating ticker={ticker} finalScore={analysis?.finalScore ?? null} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AgentScoresSection scores={analysis?.agentScores || []} ticker={ticker} />
        <RiskFactorsSection risks={analysis?.riskFactors || []} />
        <DebateSummarySection summary={analysis?.debateSummary} />
      </div>
    </div>
  )
}

function AgentScoresSection({ scores, ticker }: { scores: AgentScore[]; ticker: string }) {
  const router = useRouter()

  function handleViewDetails() {
    router.push(`/stock/${ticker}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Agent Breakdown
        </h4>
        <button
          onClick={handleViewDetails}
          className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
        >
          View Details
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <div 
        className="space-y-2 cursor-pointer hover:bg-zinc-800/30 rounded-lg p-2 -m-2 transition-colors"
        onClick={handleViewDetails}
        title={`View full analysis for ${ticker}`}
      >
        {scores.map(agent => (
          <AgentScoreBar key={agent.agent_name} agent={agent} />
        ))}
      </div>
    </div>
  )
}

function RiskFactorsSection({ risks }: { risks: string[] }) {
  if (risks.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Risk Factors
      </h4>
      <ul className="space-y-1.5">
        {risks.slice(0, 4).map((risk, i) => (
          <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
            <span className="text-rose-400 mt-0.5">•</span>
            <span>{risk}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DebateSummarySection({ summary }: { summary: string | null }) {
  if (!summary) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Analysis Summary
      </h4>
      <p className="text-xs text-zinc-400 leading-relaxed">{summary}</p>
    </div>
  )
}

// Removed legacy rating functions - using unified conviction system

