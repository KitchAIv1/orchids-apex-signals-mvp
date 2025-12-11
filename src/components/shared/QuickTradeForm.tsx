'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, RotateCcw, Loader2, AlertTriangle, Zap } from 'lucide-react'

type QuickTradeFormProps = {
  buyTicker: string
  setBuyTicker: (value: string) => void
  buyShares: string
  setBuyShares: (value: string) => void
  isLinkedTrade: boolean
  aiDirection: string | null
  actionLoading: string | null
  onBuy: () => void
  onReset: () => void
}

export function QuickTradeForm({
  buyTicker,
  setBuyTicker,
  buyShares,
  setBuyShares,
  isLinkedTrade,
  aiDirection,
  actionLoading,
  onBuy,
  onReset
}: QuickTradeFormProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-zinc-900/50 p-5",
      isLinkedTrade ? "border-emerald-500/30" : "border-zinc-800"
    )}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            {isLinkedTrade ? 'APEX-Linked Trade' : 'Quick Trade'}
          </h3>
          {isLinkedTrade ? (
            <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Linked to APEX prediction • Entry signal: {aiDirection}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 mt-0.5">
              For validation accuracy, use "Trade This" from Predictions page
            </p>
          )}
        </div>
        <button
          onClick={onReset}
          disabled={actionLoading === 'reset'}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
        >
          {actionLoading === 'reset' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          Reset
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Ticker (e.g. AAPL)"
          value={buyTicker}
          onChange={e => setBuyTicker(e.target.value.toUpperCase())}
          className="w-36 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Shares"
          value={buyShares}
          onChange={e => setBuyShares(e.target.value)}
          min="1"
          className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={onBuy}
          disabled={!buyTicker || !buyShares || actionLoading === 'buy'}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed",
            isLinkedTrade 
              ? "bg-emerald-600 hover:bg-emerald-500" 
              : "bg-zinc-600 hover:bg-zinc-500"
          )}
        >
          {actionLoading === 'buy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          {isLinkedTrade ? 'Execute Trade' : 'Manual Buy'}
        </button>
        {!isLinkedTrade && buyTicker && buyShares && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Manual trades won't be tracked for APEX validation
          </span>
        )}
      </div>
    </div>
  )
}

