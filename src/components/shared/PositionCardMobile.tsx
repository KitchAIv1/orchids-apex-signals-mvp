'use client'

import { cn } from '@/lib/utils'
import { Loader2, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react'
import { ApexSignalBadge } from './ApexSignalBadge'
import type { Position } from './OpenPositionsTable'

type Props = {
  position: Position
  actionLoading: string | null
  onSell: (tradeId: string) => void
  formatCurrency: (n: number) => string
  formatPct: (n: number) => string
}

export function PositionCardMobile({
  position: p,
  actionLoading,
  onSell,
  formatCurrency,
  formatPct
}: Props) {
  const isSellSignal = p.apex_signal.currentRecommendation === 'SELL' && p.apex_signal.entrySignal === 'BUY'

  return (
    <div className={cn(
      "rounded-xl border bg-zinc-900/50 p-4 transition-all",
      p.apex_signal.signalChanged ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800"
    )}>
      {/* Header: Ticker + P&L */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-zinc-100">{p.ticker}</span>
            <span className="text-xs text-zinc-500">{p.shares} shares</span>
          </div>
          <div className={cn('text-sm font-medium mt-0.5', p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(p.unrealized_pnl)} ({formatPct(p.unrealized_pnl_pct)})
          </div>
        </div>
        
        <ApexSignalBadge signal={p.apex_signal} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div>
          <span className="block text-zinc-500 mb-0.5">Avg Entry</span>
          <span className="block font-medium text-zinc-300">${p.entry_price.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-zinc-500 mb-0.5">Current Price</span>
          <span className="block font-medium text-zinc-300">${p.current_price.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Button */}
      {isSellSignal ? (
        <button
          onClick={() => onSell(p.id)}
          disabled={actionLoading === p.id}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 animate-pulse"
        >
          {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          APEX Says EXIT
        </button>
      ) : (
        <button
          onClick={() => onSell(p.id)}
          disabled={actionLoading === p.id}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
        >
          {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
          Sell Position
        </button>
      )}
    </div>
  )
}

