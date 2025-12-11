'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, 
  RotateCcw, Loader2, AlertCircle, Target, Award, Briefcase,
  AlertTriangle, Zap
} from 'lucide-react'
import type { PaperPortfolio, PaperTrade } from '@/types/database'
import type { ApexSignal } from '@/services/PaperTradingService'

type Position = PaperTrade & { 
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  apex_signal: ApexSignal
}
type PortfolioWithValue = PaperPortfolio & { positions_value: number; open_positions: number }

export function PaperTradingDashboard() {
  const searchParams = useSearchParams()
  const [portfolio, setPortfolio] = useState<PortfolioWithValue | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [history, setHistory] = useState<PaperTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [buyTicker, setBuyTicker] = useState('')
  const [buyShares, setBuyShares] = useState('')
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiDirection, setAiDirection] = useState<string | null>(null)

  const positionsSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, p) => sum + (p.current_price * p.shares), 0)
    const totalCost = positions.reduce((sum, p) => sum + (p.entry_price * p.shares), 0)
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
    const totalPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
    return { totalValue, totalCost, totalPnl, totalPnlPct }
  }, [positions])

  useEffect(() => {
    const ticker = searchParams.get('ticker')
    const prediction = searchParams.get('prediction')
    const confidence = searchParams.get('confidence')
    const direction = searchParams.get('direction')
    
    if (ticker) setBuyTicker(ticker)
    if (prediction) setPredictionId(prediction)
    if (confidence) setAiConfidence(Number(confidence))
    if (direction) setAiDirection(direction)
  }, [searchParams])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/paper-trading')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPortfolio(data.portfolio)
      setPositions(data.positions)
      setHistory(data.history)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleBuy = async () => {
    if (!buyTicker || !buyShares) return
    setActionLoading('buy')
    try {
      const res = await fetch('/api/paper-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'buy', 
          ticker: buyTicker, 
          shares: Number(buyShares),
          predictionId,
          aiConfidence,
          aiDirection
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBuyTicker('')
      setBuyShares('')
      setPredictionId(null)
      setAiConfidence(null)
      setAiDirection(null)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buy failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSell = async (tradeId: string) => {
    setActionLoading(tradeId)
    try {
      const res = await fetch('/api/paper-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sell', tradeId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sell failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset portfolio to $100,000? All positions and history will be cleared.')) return
    setActionLoading('reset')
    try {
      const res = await fetch('/api/paper-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm underline">Dismiss</button>
        </div>
      )}

      {portfolio && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard
            label="Total Value"
            value={formatCurrency(portfolio.total_value)}
            icon={Wallet}
            change={portfolio.total_return_pct || 0}
          />
          <StatCard
            label="Positions Value"
            value={formatCurrency(positionsSummary.totalValue)}
            icon={Briefcase}
            subtext={`${positions.length} position${positions.length !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Cash Balance"
            value={formatCurrency(portfolio.cash_balance)}
            icon={DollarSign}
          />
          <StatCard
            label="Win Rate"
            value={`${(portfolio.win_rate || 0).toFixed(1)}%`}
            subtext={`${portfolio.winning_trades}/${portfolio.total_trades} trades`}
            icon={Award}
          />
          <StatCard
            label="vs S&P 500"
            value={formatPct(portfolio.benchmark_return_pct || 0)}
            icon={Target}
            highlight={(portfolio.total_return_pct || 0) > (portfolio.benchmark_return_pct || 0)}
          />
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Quick Trade</h3>
        <div className="flex flex-wrap gap-3">
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
            onClick={handleBuy}
            disabled={!buyTicker || !buyShares || actionLoading === 'buy'}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'buy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            Buy
          </button>
          <button
            onClick={handleReset}
            disabled={actionLoading === 'reset'}
            className="ml-auto flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            {actionLoading === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reset
          </button>
        </div>
      </div>

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
                      <button
                        onClick={() => handleSell(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                      >
                        {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingDown className="h-3 w-3" />}
                        Sell
                      </button>
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
                  <th className="pb-3 text-right font-medium">Shares</th>
                  <th className="pb-3 text-right font-medium">Entry</th>
                  <th className="pb-3 text-right font-medium">Exit</th>
                  <th className="pb-3 text-right font-medium">P&L</th>
                  <th className="pb-3 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(t => (
                  <tr key={t.id} className="border-b border-zinc-800/50">
                    <td className="py-3 font-semibold text-zinc-100">{t.ticker}</td>
                    <td className="py-3 text-right text-zinc-300">{t.shares}</td>
                    <td className="py-3 text-right text-zinc-400">${t.entry_price.toFixed(2)}</td>
                    <td className="py-3 text-right text-zinc-300">${t.exit_price?.toFixed(2) || '-'}</td>
                    <td className={cn('py-3 text-right font-medium', (t.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {formatCurrency(t.realized_pnl || 0)} ({formatPct(t.realized_pnl_pct || 0)})
                    </td>
                    <td className="py-3 text-right text-zinc-500">
                      {t.exit_timestamp ? new Date(t.exit_timestamp).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, change, subtext, highlight }: {
  label: string
  value: string
  icon: typeof Wallet
  change?: number
  subtext?: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className={cn('h-5 w-5', highlight ? 'text-emerald-400' : 'text-zinc-500')} />
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-100">{value}</p>
      {change !== undefined && (
        <p className={cn('mt-1 text-sm font-medium', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}% return
        </p>
      )}
      {subtext && <p className="mt-1 text-sm text-zinc-500">{subtext}</p>}
    </div>
  )
}

function ApexSignalBadge({ signal }: { signal: ApexSignal }) {
  const { currentRecommendation, currentScore, signalChanged, entrySignal } = signal

  if (!currentRecommendation) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-zinc-600 uppercase">No Signal</span>
        <span className="text-xs text-zinc-500">Not in APEX</span>
      </div>
    )
  }

  const recColor = {
    BUY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    HOLD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    SELL: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  }[currentRecommendation]

  // Determine if this is a problematic signal change (entered BUY, now SELL or vice versa)
  const isMajorChange = signalChanged && (
    (entrySignal === 'BUY' && currentRecommendation === 'SELL') ||
    (entrySignal === 'SELL' && currentRecommendation === 'BUY')
  )

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-bold border',
          recColor
        )}>
          {currentRecommendation}
        </span>
        {currentScore !== null && (
          <span className="text-xs text-zinc-500">{currentScore}</span>
        )}
      </div>
      
      {signalChanged && (
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
          isMajorChange 
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        )}>
          {isMajorChange ? (
            <AlertTriangle className="h-2.5 w-2.5" />
          ) : (
            <Zap className="h-2.5 w-2.5" />
          )}
          <span>
            {entrySignal} → {currentRecommendation}
          </span>
        </div>
      )}
      
      {!signalChanged && entrySignal && (
        <span className="text-[10px] text-zinc-600">
          Entry: {entrySignal}
        </span>
      )}
      
      {!entrySignal && (
        <span className="text-[10px] text-zinc-600">
          Manual trade
        </span>
      )}
    </div>
  )
}