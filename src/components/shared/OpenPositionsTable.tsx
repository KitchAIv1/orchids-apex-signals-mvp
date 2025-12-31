'use client'

import { cn } from '@/lib/utils'
import { TrendingDown, Loader2, AlertTriangle, Zap } from 'lucide-react'
import { ApexSignalBadge } from './ApexSignalBadge'
import { PositionCardMobile } from './PositionCardMobile'
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
          <div className="text-right hidden sm:block">
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
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {positions.map(p => (
              <PositionCardMobile
                key={p.id}
                position={p}
                actionLoading={actionLoading}
                onSell={onSell}
                formatCurrency={formatCurrency}
                formatPct={formatPct}
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 text-left font-medium pl-4">Ticker</th>
                  <th className="pb-3 text-center font-medium">Signal</th>
                  <th className="pb-3 text-right font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Avg Cost</th>
                  <th className="pb-3 text-right font-medium">Cost Basis</th>
                  <th className="pb-3 text-right font-medium">Price</th>
                  <th className="pb-3 text-right font-medium">Mkt Value</th>
                  <th className="pb-3 text-right font-medium">P&L</th>
                  <th className="pb-3 text-right font-medium pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const isSignalChange = p.apex_signal.signalChanged
                  // Derive recommendation from score for consistency
                  const scoreBasedRec = p.apex_signal.currentScore === null ? 'HOLD'
                    : p.apex_signal.currentScore > 30 ? 'BUY'
                    : p.apex_signal.currentScore < -30 ? 'SELL' : 'HOLD'
                  const isSellSignal = scoreBasedRec === 'SELL' && p.apex_signal.entrySignal === 'BUY'
                  
                  return (
                    <tr key={p.id} className={cn(
                      "border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30",
                      isSignalChange && !isSellSignal && "bg-amber-500/5 hover:bg-amber-500/10",
                      isSellSignal && "bg-rose-950/10 hover:bg-rose-950/20 border-l-2 border-l-rose-500"
                    )}>
                      <td className="py-3 font-bold text-zinc-100 pl-4">{p.ticker}</td>
                      <td className="py-3">
                        <div className="flex justify-center">
                          <ApexSignalBadge signal={p.apex_signal} />
                        </div>
                      </td>
                      <td className="py-3 text-right text-zinc-300">{p.shares}</td>
                      <td className="py-3 text-right text-zinc-400">${p.entry_price.toFixed(2)}</td>
                      <td className="py-3 text-right text-zinc-400">{formatCurrency(p.total_cost)}</td>
                      <td className="py-3 text-right text-zinc-300">${p.current_price.toFixed(2)}</td>
                      <td className="py-3 text-right text-zinc-100 font-medium">
                        {formatCurrency(p.current_price * p.shares)}
                      </td>
                      <td className={cn('py-3 text-right font-bold', p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(p.unrealized_pnl)}
                        <span className="block text-xs opacity-80 font-normal">{formatPct(p.unrealized_pnl_pct)}</span>
                      </td>
                      <td className="py-3 text-right pr-4">
                        {isSellSignal ? (
                          <button
                            onClick={() => onSell(p.id)}
                            disabled={actionLoading === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 animate-pulse shadow-lg shadow-rose-900/20"
                          >
                            {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                            Exit Now
                          </button>
                        ) : (
                          <button
                            onClick={() => onSell(p.id)}
                            disabled={actionLoading === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-all"
                          >
                            {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingDown className="h-3 w-3" />}
                            Sell
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-700 bg-zinc-800/30">
                  <td className="py-4 font-bold text-zinc-100 pl-4">TOTAL</td>
                  <td className="py-4"></td>
                  <td className="py-4 text-right text-zinc-300">—</td>
                  <td className="py-4 text-right text-zinc-400">—</td>
                  <td className="py-4 text-right text-zinc-400 font-medium">{formatCurrency(positionsSummary.totalCost)}</td>
                  <td className="py-4 text-right text-zinc-300">—</td>
                  <td className="py-4 text-right text-zinc-100 font-bold">{formatCurrency(positionsSummary.totalValue)}</td>
                  <td className={cn('py-4 text-right font-bold', positionsSummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(positionsSummary.totalPnl)}
                    <span className="block text-xs font-medium">({formatPct(positionsSummary.totalPnlPct)})</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
