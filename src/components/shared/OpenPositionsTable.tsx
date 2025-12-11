'use client'

import { cn } from '@/lib/utils'
import { TrendingDown, Loader2, AlertTriangle } from 'lucide-react'
import { ApexSignalBadge } from './ApexSignalBadge'
import type { PaperTrade } from '@/types/database'
import type { ApexSignal } from '@/services/PaperTradingService'

export type Position = PaperTrade & { 
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  apex_signal: ApexSignal
}

type OpenPositionsTableProps = {
  positions: Position[]
  positionsSummary: {
    totalValue: number
    totalCost: number
    totalPnl: number
    totalPnlPct: number
  }
  actionLoading: string | null
  onSell: (tradeId: string) => void
  formatCurrency: (n: number) => string
  formatPct: (n: number) => string
}

export function OpenPositionsTable({
  positions,
  positionsSummary,
  actionLoading,
  onSell,
  formatCurrency,
  formatPct
}: OpenPositionsTableProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Open Positions ({positions.length})</h3>
        {positions.length > 0 && (
          <div className="text-right">
            <span className="text-sm text-zinc-400">Total: </span>
            <span className="text-lg font-bold text-zinc-100">{formatCurrency(positionsSummary.totalValue)}</span>
            <span className={cn('ml-2 text-sm font-medium', positionsSummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              ({formatPct(positionsSummary.totalPnlPct)})
            </span>
          </div>
        )}
      </div>
      {positions.length === 0 ? (
        <p className="text-zinc-500 py-8 text-center">No open positions. Buy a stock to get started!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 text-left font-medium">Ticker</th>
                <th className="pb-3 text-center font-medium">APEX Signal</th>
                <th className="pb-3 text-right font-medium">Shares</th>
                <th className="pb-3 text-right font-medium">Entry</th>
                <th className="pb-3 text-right font-medium">Current</th>
                <th className="pb-3 text-right font-medium">P&L</th>
                <th className="pb-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} className={cn(
                  "border-b border-zinc-800/50",
                  p.apex_signal.signalChanged && "bg-amber-500/5"
                )}>
                  <td className="py-3 font-semibold text-zinc-100">{p.ticker}</td>
                  <td className="py-3">
                    <ApexSignalBadge signal={p.apex_signal} />
                  </td>
                  <td className="py-3 text-right text-zinc-300">{p.shares}</td>
                  <td className="py-3 text-right text-zinc-400">${p.entry_price.toFixed(2)}</td>
                  <td className="py-3 text-right text-zinc-300">${p.current_price.toFixed(2)}</td>
                  <td className={cn('py-3 text-right font-medium', p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(p.unrealized_pnl)} ({formatPct(p.unrealized_pnl_pct)})
                  </td>
                  <td className="py-3 text-right">
                    {p.apex_signal.currentRecommendation === 'SELL' && p.apex_signal.entrySignal === 'BUY' ? (
                      <button
                        onClick={() => onSell(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 animate-pulse"
                      >
                        {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                        Exit Now
                      </button>
                    ) : (
                      <button
                        onClick={() => onSell(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                      >
                        {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingDown className="h-3 w-3" />}
                        Sell
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-700 bg-zinc-800/30">
                <td className="py-3 font-bold text-zinc-100">TOTAL</td>
                <td className="py-3"></td>
                <td className="py-3 text-right text-zinc-300">—</td>
                <td className="py-3 text-right text-zinc-400">{formatCurrency(positionsSummary.totalCost)}</td>
                <td className="py-3 text-right text-zinc-300">—</td>
                <td className={cn('py-3 text-right font-bold', positionsSummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(positionsSummary.totalPnl)} ({formatPct(positionsSummary.totalPnlPct)})
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

