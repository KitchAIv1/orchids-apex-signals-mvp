'use client'

import { cn } from '@/lib/utils'
import type { PaperTrade } from '@/types/database'

type TradeHistoryTableProps = {
  history: PaperTrade[]
  formatCurrency: (n: number) => string
  formatPct: (n: number) => string
}

export function TradeHistoryTable({
  history,
  formatCurrency,
  formatPct
}: TradeHistoryTableProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Trade History</h3>
      {history.length === 0 ? (
        <p className="text-zinc-500 py-8 text-center">No completed trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 text-left font-medium">Ticker</th>
                <th className="pb-3 text-center font-medium">Entry Signal</th>
                <th className="pb-3 text-right font-medium">Shares</th>
                <th className="pb-3 text-right font-medium">Entry</th>
                <th className="pb-3 text-right font-medium">Exit</th>
                <th className="pb-3 text-right font-medium">P&L</th>
                <th className="pb-3 text-right font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {history.map(trade => {
                const pnl = trade.realized_pnl || 0
                const entrySignal = trade.ai_direction
                const wasAligned = entrySignal === 'BUY' && pnl > 0
                return (
                  <tr key={trade.id} className="border-b border-zinc-800/50">
                    <td className="py-3 font-semibold text-zinc-100">{trade.ticker}</td>
                    <td className="py-3 text-center">
                      {entrySignal ? (
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold',
                          entrySignal === 'BUY' && 'bg-emerald-500/20 text-emerald-400',
                          entrySignal === 'HOLD' && 'bg-amber-500/20 text-amber-400',
                          entrySignal === 'SELL' && 'bg-rose-500/20 text-rose-400'
                        )}>
                          {entrySignal}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">Manual</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-zinc-300">{trade.shares}</td>
                    <td className="py-3 text-right text-zinc-400">${trade.entry_price.toFixed(2)}</td>
                    <td className="py-3 text-right text-zinc-300">${trade.exit_price?.toFixed(2) || '-'}</td>
                    <td className={cn('py-3 text-right font-medium', pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {formatCurrency(pnl)} ({formatPct(trade.realized_pnl_pct || 0)})
                    </td>
                    <td className="py-3 text-right">
                      {entrySignal ? (
                        wasAligned ? (
                          <span className="text-xs text-emerald-400">✓ APEX Correct</span>
                        ) : pnl < 0 && entrySignal === 'BUY' ? (
                          <span className="text-xs text-rose-400">✗ APEX Wrong</span>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )
                      ) : (
                        <span className="text-xs text-zinc-600">Untracked</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

