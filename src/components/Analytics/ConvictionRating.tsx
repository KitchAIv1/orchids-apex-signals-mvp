'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'

type Conviction = 'Bullish' | 'Neutral' | 'Bearish'

type Props = {
  ticker: string
  finalScore: number | null
}

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

export function ConvictionRating({ ticker, finalScore }: Props) {
  const router = useRouter()
  const conviction = getConvictionFromScore(finalScore)
  const convictionConfig = getConvictionConfig(conviction)
  const Icon = convictionConfig.icon

  function handleViewStock() {
    router.push(`/stock/${ticker}`)
  }

  return (
    <div 
      className="p-4 border-b border-zinc-800 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/50 transition-colors"
      onClick={handleViewStock}
      title={`View full analysis for ${ticker}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">APEX Rating for {ticker}</h3>
        <ExternalLink className="h-4 w-4 text-zinc-600 hover:text-amber-400 transition-colors" />
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

