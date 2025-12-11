'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Wallet, DollarSign, Loader2, AlertCircle, Target, Award, Briefcase,
  AlertTriangle, Zap
} from 'lucide-react'
import type { PaperPortfolio, PaperTrade } from '@/types/database'
import type { ApexSignal } from '@/services/PaperTradingService'
import { PortfolioStatCard } from './PortfolioStatCard'
import { QuickTradeForm } from './QuickTradeForm'
import { OpenPositionsTable, type Position } from './OpenPositionsTable'
import { TradeHistoryTable } from './TradeHistoryTable'

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

  const signalAlerts = useMemo(() => {
    const exitSignals = positions.filter(p => 
      p.apex_signal.currentRecommendation === 'SELL' && p.apex_signal.entrySignal === 'BUY'
    )
    const signalChanges = positions.filter(p => p.apex_signal.signalChanged)
    return { exitSignals, signalChanges }
  }, [positions])

  const isLinkedTrade = Boolean(predictionId && aiDirection)

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
      const responseData = await res.json()
      if (responseData.error) throw new Error(responseData.error)
      setPortfolio(responseData.portfolio)
      setPositions(responseData.positions)
      setHistory(responseData.history)
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
      const responseData = await res.json()
      if (responseData.error) throw new Error(responseData.error)
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
      const responseData = await res.json()
      if (responseData.error) throw new Error(responseData.error)
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
      const responseData = await res.json()
      if (responseData.error) throw new Error(responseData.error)
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

      {signalAlerts.exitSignals.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-4">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-400">
              {signalAlerts.exitSignals.length} Position{signalAlerts.exitSignals.length > 1 ? 's' : ''} — APEX Says EXIT
            </p>
            <p className="text-sm text-rose-300/80 mt-1">
              {signalAlerts.exitSignals.map(p => p.ticker).join(', ')} entered as BUY but APEX now recommends SELL. 
              Consider closing to align with the signal.
            </p>
          </div>
        </div>
      )}

      {signalAlerts.signalChanges.length > 0 && signalAlerts.exitSignals.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
          <Zap className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-400">Signal Changes Detected</p>
            <p className="text-sm text-amber-300/80 mt-1">
              {signalAlerts.signalChanges.length} position{signalAlerts.signalChanges.length > 1 ? 's have' : ' has'} changed 
              since entry. Review the APEX Signal column below.
            </p>
          </div>
        </div>
      )}

      {portfolio && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <PortfolioStatCard
            label="Total Value"
            value={formatCurrency(portfolio.total_value)}
            icon={Wallet}
            change={portfolio.total_return_pct || 0}
          />
          <PortfolioStatCard
            label="Positions Value"
            value={formatCurrency(positionsSummary.totalValue)}
            icon={Briefcase}
            subtext={`${positions.length} position${positions.length !== 1 ? 's' : ''}`}
          />
          <PortfolioStatCard
            label="Cash Balance"
            value={formatCurrency(portfolio.cash_balance)}
            icon={DollarSign}
          />
          <PortfolioStatCard
            label="Win Rate"
            value={`${(portfolio.win_rate || 0).toFixed(1)}%`}
            subtext={`${portfolio.winning_trades}/${portfolio.total_trades} trades`}
            icon={Award}
          />
          <PortfolioStatCard
            label="vs S&P 500"
            value={formatPct(portfolio.benchmark_return_pct || 0)}
            icon={Target}
            highlight={(portfolio.total_return_pct || 0) > (portfolio.benchmark_return_pct || 0)}
          />
        </div>
      )}

      <QuickTradeForm
        buyTicker={buyTicker}
        setBuyTicker={setBuyTicker}
        buyShares={buyShares}
        setBuyShares={setBuyShares}
        isLinkedTrade={isLinkedTrade}
        aiDirection={aiDirection}
        actionLoading={actionLoading}
        onBuy={handleBuy}
        onReset={handleReset}
      />

      <OpenPositionsTable
        positions={positions}
        positionsSummary={positionsSummary}
        actionLoading={actionLoading}
        onSell={handleSell}
        formatCurrency={formatCurrency}
        formatPct={formatPct}
      />

      <TradeHistoryTable
        history={history}
        formatCurrency={formatCurrency}
        formatPct={formatPct}
      />
    </div>
  )
}
