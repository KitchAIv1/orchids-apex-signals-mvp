'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { AgentScore } from '@/types/database'

type StockAnalysis = {
  recommendation: string | null
  finalScore: number | null
  confidence: string | null
  riskFactors: string[]
  debateSummary: string | null
  agentScores: AgentScore[]
}

type Props = {
  ticker: string | null
  stockId: string | null
}

const AGENT_LABELS: Record<string, string> = {
  fundamental: 'Financials',
  technical: 'Technicals',
  sentiment: 'Sentiment',
  macro: 'Macro',
  insider: 'Insider',
  catalyst: 'Catalysts'
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
      .select('recommendation, final_score, confidence, risk_factors, debate_summary')
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
      recommendation: prediction?.recommendation || null,
      finalScore: prediction?.final_score || null,
      confidence: prediction?.confidence || null,
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
      <OverallRating
        ticker={ticker}
        recommendation={analysis?.recommendation}
        finalScore={analysis?.finalScore}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AgentScoresSection scores={analysis?.agentScores || []} />
        <RiskFactorsSection risks={analysis?.riskFactors || []} />
        <DebateSummarySection summary={analysis?.debateSummary} />
      </div>
    </div>
  )
}

function OverallRating({ ticker, recommendation, finalScore }: { 
  ticker: string
  recommendation: string | null
  finalScore: number | null 
}) {
  // Unified conviction signal - derived from SCORE (not legacy recommendation)
  // Score scale: -100 to +100
  // Bullish: > +30, Neutral: -30 to +30, Bearish: < -30
  const conviction = getConvictionFromScore(finalScore)
  const convictionConfig = getConvictionConfig(conviction)
  const Icon = convictionConfig.icon

  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">APEX Rating for {ticker}</h3>
        <Info className="h-4 w-4 text-zinc-600" />
      </div>

      {/* Primary Conviction Signal */}
      <div className={cn('flex items-center gap-3', convictionConfig.textColor)}>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          convictionConfig.bgColor
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{conviction}</div>
          <div className="text-xs text-zinc-500">
            Power Gauge: {finalScore !== null ? (finalScore > 0 ? '+' : '') + finalScore : 'N/A'}
          </div>
        </div>
      </div>

      {/* Conviction Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
          {/* Gradient bar */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-gradient-to-r from-rose-600 to-rose-500" />
            <div className="flex-1 bg-gradient-to-r from-rose-500 via-amber-500 to-amber-500" />
            <div className="flex-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600" />
          </div>
          {/* Indicator */}
          {finalScore !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-zinc-900 shadow-lg transition-all duration-500"
              style={{ left: `${Math.min(97, Math.max(3, ((finalScore + 100) / 200) * 100))}%` }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

type Conviction = 'Bullish' | 'Neutral' | 'Bearish'

/**
 * Derive conviction from the SCORE (not the legacy recommendation)
 * Score scale: -100 to +100
 * - Bullish: score > +30
 * - Bearish: score < -30
 * - Neutral: -30 to +30
 */
function getConvictionFromScore(score: number | null): Conviction {
  if (score === null) return 'Neutral'
  if (score > 30) return 'Bullish'
  if (score < -30) return 'Bearish'
  return 'Neutral'
}

function getConvictionConfig(conviction: Conviction) {
  const configs = {
    Bullish: {
      icon: TrendingUp,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    },
    Neutral: {
      icon: Minus,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/20'
    },
    Bearish: {
      icon: TrendingDown,
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/20'
    }
  }
  return configs[conviction]
}

function AgentScoresSection({ scores }: { scores: AgentScore[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Agent Breakdown
      </h4>
      <div className="space-y-2">
        {scores.map(agent => (
          <AgentScoreBar key={agent.agent_name} agent={agent} />
        ))}
      </div>
    </div>
  )
}

function AgentScoreBar({ agent }: { agent: AgentScore }) {
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

