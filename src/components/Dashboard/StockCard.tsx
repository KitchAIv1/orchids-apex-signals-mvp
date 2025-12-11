'use client'

import Link from 'next/link'
import { RecommendationBadge } from './RecommendationBadge'
import { ScoreBadge } from './ScoreBadge'
import { AgentService } from '@/services/AgentService'
import type { StockWithLatestData } from '@/services/StockAnalysisService'
import type { StockPrice } from '@/hooks/useStockPrices'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Props = {
  stock: StockWithLatestData
  price?: StockPrice
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

export function StockCard({ stock, price }: Props) {
  const { ticker, company_name, sector, latestPrediction, agentScores } = stock
  
  const calculatedScore = agentScores.length > 0 
    ? AgentService.calculateWeightedScore(agentScores)
    : latestPrediction?.final_score ?? null
  
  const recommendation = latestPrediction?.recommendation 
    ?? (calculatedScore ? AgentService.getRecommendation(calculatedScore) : null)
  
  const consensus = agentScores.length > 0 
    ? AgentService.identifyConsensusLevel(agentScores) 
    : null

  const isPositive = price && price.change >= 0
  const isNegative = price && price.change < 0

  return (
    <Link href={`/stock/${ticker}`}>
      <div className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-zinc-900/90 backdrop-blur-md',
        'border border-zinc-800/60',
        'p-5 transition-all duration-300 ease-out',
        'hover:border-zinc-700/80 hover:shadow-2xl hover:shadow-zinc-950/50',
        'hover:-translate-y-1 hover:scale-[1.01]'
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/10 via-transparent to-zinc-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {price && (
          <div className={cn(
            'absolute top-0 right-0 w-24 h-24 opacity-[0.03] blur-2xl transition-opacity',
            isPositive && 'bg-emerald-400',
            isNegative && 'bg-rose-400',
            !isPositive && !isNegative && 'bg-zinc-400'
          )} />
        )}
        
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-lg font-semibold text-zinc-50 tracking-tight font-mono">{ticker}</span>
                {sector && (
                  <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    {sector}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 truncate leading-relaxed">{company_name}</p>
            </div>
            
            <RecommendationBadge recommendation={recommendation} />
          </div>

          {price ? (
            <div className="mb-4 pb-4 border-b border-zinc-800/50">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold text-zinc-100 tracking-tight tabular-nums">
                    {formatPrice(price.price)}
                  </p>
                </div>
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
                  isPositive && 'bg-emerald-500/10',
                  isNegative && 'bg-rose-500/10',
                  !isPositive && !isNegative && 'bg-zinc-800/50'
                )}>
                  {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                  {isNegative && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                  {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 text-zinc-500" />}
                  <span className={cn(
                    'text-sm font-semibold tabular-nums',
                    isPositive && 'text-emerald-400',
                    isNegative && 'text-rose-400',
                    !isPositive && !isNegative && 'text-zinc-500'
                  )}>
                    {formatPercent(price.changePercent)}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
                <span>H: <span className="text-zinc-400 tabular-nums">{formatPrice(price.high)}</span></span>
                <span>L: <span className="text-zinc-400 tabular-nums">{formatPrice(price.low)}</span></span>
              </div>
            </div>
          ) : (
            <div className="mb-4 pb-4 border-b border-zinc-800/50">
              <div className="h-8 w-24 bg-zinc-800/30 rounded animate-pulse" />
              <div className="mt-2 h-3 w-32 bg-zinc-800/20 rounded animate-pulse" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <ScoreBadge score={calculatedScore} showLabel />
            
            {consensus && (
              <div className="text-right">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Consensus</p>
                <p className={cn(
                  'text-xs font-semibold tracking-wide',
                  consensus === 'STRONG' && 'text-emerald-400',
                  consensus === 'MODERATE' && 'text-sky-400',
                  consensus === 'WEAK' && 'text-amber-400',
                  consensus === 'DIVIDED' && 'text-rose-400'
                )}>
                  {consensus}
                </p>
              </div>
            )}
          </div>

          {agentScores.length > 0 && (
            <div className="mt-4 flex gap-1">
              {agentScores.slice(0, 6).map((agent, i) => (
                <div
                  key={agent.id || i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: agent.score >= 70 
                      ? 'rgb(16 185 129 / 0.5)' 
                      : agent.score >= 40 
                      ? 'rgb(245 158 11 / 0.5)' 
                      : 'rgb(244 63 94 / 0.5)'
                  }}
                  title={`${agent.agent_name}: ${agent.score}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
