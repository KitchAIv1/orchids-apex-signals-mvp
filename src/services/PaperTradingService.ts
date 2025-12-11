import { supabase } from '@/lib/supabase'
import type { PaperPortfolio, PaperTrade } from '@/types/database'
import { getStockQuote } from './YahooFinanceService'

const INITIAL_BALANCE = 100000
const DEMO_PORTFOLIO_ID = '00000000-0000-0000-0000-000000000001'

export class PaperTradingService {
  static async getOrCreatePortfolio(): Promise<PaperPortfolio> {
    const { data: existing } = await supabase
      .from('paper_portfolio')
      .select('*')
      .eq('id', DEMO_PORTFOLIO_ID)
      .single()

    if (existing) return existing

    const spyPrice = await this.getSPYPrice()
    
    const { data: created, error } = await supabase
      .from('paper_portfolio')
      .insert({
        id: DEMO_PORTFOLIO_ID,
        initial_balance: INITIAL_BALANCE,
        cash_balance: INITIAL_BALANCE,
        total_value: INITIAL_BALANCE,
        total_return_pct: 0,
        benchmark_start_price: spyPrice,
        benchmark_return_pct: 0,
        win_rate: 0,
        total_trades: 0,
        winning_trades: 0,
        auto_execute_enabled: false,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create portfolio: ${error.message}`)
    return created!
  }

  static async getSPYPrice(): Promise<number> {
    try {
      const quote = await getStockQuote('SPY')
      return quote.price
    } catch {
      return 590
    }
  }

  static async executeBuy(params: {
    ticker: string
    shares: number
    predictionId?: string
    aiConfidence?: number
    aiDirection?: string
    notes?: string
  }): Promise<PaperTrade> {
    const portfolio = await this.getOrCreatePortfolio()
    const quote = await getStockQuote(params.ticker)
    const totalCost = quote.price * params.shares

    if (totalCost > portfolio.cash_balance) {
      throw new Error(`Insufficient funds. Need $${totalCost.toFixed(2)}, have $${portfolio.cash_balance.toFixed(2)}`)
    }

    const { data: trade, error: tradeError } = await supabase
      .from('paper_trades')
      .insert({
        portfolio_id: DEMO_PORTFOLIO_ID,
        ticker: params.ticker,
        prediction_id: params.predictionId || null,
        trade_type: 'BUY',
        status: 'OPEN',
        shares: params.shares,
        entry_price: quote.price,
        total_cost: totalCost,
        ai_confidence: params.aiConfidence || null,
        ai_direction: params.aiDirection || null,
        notes: params.notes || null,
      })
      .select()
      .single()

    if (tradeError) throw new Error(`Failed to create trade: ${tradeError.message}`)

    await supabase
      .from('paper_portfolio')
      .update({
        cash_balance: portfolio.cash_balance - totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', DEMO_PORTFOLIO_ID)

    return trade!
  }

  static async executeSell(tradeId: string): Promise<PaperTrade> {
    const { data: trade, error: fetchError } = await supabase
      .from('paper_trades')
      .select('*')
      .eq('id', tradeId)
      .single()

    if (fetchError || !trade) throw new Error('Trade not found')
    if (trade.status === 'CLOSED') throw new Error('Trade already closed')

    const quote = await getStockQuote(trade.ticker)
    const totalProceeds = quote.price * trade.shares
    const realizedPnl = totalProceeds - trade.total_cost
    const realizedPnlPct = (realizedPnl / trade.total_cost) * 100

    const { data: updated, error: updateError } = await supabase
      .from('paper_trades')
      .update({
        status: 'CLOSED',
        exit_price: quote.price,
        exit_timestamp: new Date().toISOString(),
        total_proceeds: totalProceeds,
        realized_pnl: realizedPnl,
        realized_pnl_pct: realizedPnlPct,
      })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to close trade: ${updateError.message}`)

    const portfolio = await this.getOrCreatePortfolio()
    const isWin = realizedPnl > 0

    await supabase
      .from('paper_portfolio')
      .update({
        cash_balance: portfolio.cash_balance + totalProceeds,
        total_trades: portfolio.total_trades + 1,
        winning_trades: portfolio.winning_trades + (isWin ? 1 : 0),
        win_rate: ((portfolio.winning_trades + (isWin ? 1 : 0)) / (portfolio.total_trades + 1)) * 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', DEMO_PORTFOLIO_ID)

    return updated!
  }

  static async getOpenPositions(): Promise<(PaperTrade & { 
    current_price: number
    unrealized_pnl: number
    unrealized_pnl_pct: number
    market_state: string
    pre_market_price: number | null
    pre_market_change_pct: number | null
    post_market_price: number | null
    post_market_change_pct: number | null
  })[]> {
    const { data: trades } = await supabase
      .from('paper_trades')
      .select('*')
      .eq('portfolio_id', DEMO_PORTFOLIO_ID)
      .eq('status', 'OPEN')
      .order('entry_timestamp', { ascending: false })

    if (!trades || trades.length === 0) return []

    const tickers = [...new Set(trades.map(t => t.ticker))]
    const quotes = await Promise.all(tickers.map(t => getStockQuote(t).catch(() => ({ 
      price: 0, 
      marketState: 'CLOSED' as const,
      preMarketPrice: null,
      preMarketChangePercent: null,
      postMarketPrice: null,
      postMarketChangePercent: null
    }))))
    const quoteMap = Object.fromEntries(tickers.map((t, i) => [t, quotes[i]]))

    return trades.map(trade => {
      const quote = quoteMap[trade.ticker]
      const currentPrice = quote?.price || trade.entry_price
      const currentValue = currentPrice * trade.shares
      const unrealizedPnl = currentValue - trade.total_cost
      const unrealizedPnlPct = (unrealizedPnl / trade.total_cost) * 100
      return { 
        ...trade, 
        current_price: currentPrice, 
        unrealized_pnl: unrealizedPnl, 
        unrealized_pnl_pct: unrealizedPnlPct,
        market_state: quote?.marketState || 'CLOSED',
        pre_market_price: quote?.preMarketPrice ?? null,
        pre_market_change_pct: quote?.preMarketChangePercent ?? null,
        post_market_price: quote?.postMarketPrice ?? null,
        post_market_change_pct: quote?.postMarketChangePercent ?? null
      }
    })
  }

  static async getTradeHistory(): Promise<PaperTrade[]> {
    const { data } = await supabase
      .from('paper_trades')
      .select('*')
      .eq('portfolio_id', DEMO_PORTFOLIO_ID)
      .eq('status', 'CLOSED')
      .order('exit_timestamp', { ascending: false })
      .limit(50)

    return data || []
  }

  static async getPortfolioWithValue(): Promise<PaperPortfolio & { positions_value: number; open_positions: number }> {
    const portfolio = await this.getOrCreatePortfolio()
    const positions = await this.getOpenPositions()
    
    const positionsValue = positions.reduce((sum, p) => sum + (p.current_price * p.shares), 0)
    const totalValue = portfolio.cash_balance + positionsValue
    const totalReturnPct = ((totalValue - portfolio.initial_balance) / portfolio.initial_balance) * 100

    let benchmarkReturnPct = 0
    if (portfolio.benchmark_start_price) {
      const currentSpy = await this.getSPYPrice()
      benchmarkReturnPct = ((currentSpy - portfolio.benchmark_start_price) / portfolio.benchmark_start_price) * 100
    }

    await supabase
      .from('paper_portfolio')
      .update({
        total_value: totalValue,
        total_return_pct: totalReturnPct,
        benchmark_return_pct: benchmarkReturnPct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', DEMO_PORTFOLIO_ID)

    return {
      ...portfolio,
      total_value: totalValue,
      total_return_pct: totalReturnPct,
      benchmark_return_pct: benchmarkReturnPct,
      positions_value: positionsValue,
      open_positions: positions.length,
    }
  }

  static async resetPortfolio(): Promise<void> {
    await supabase.from('paper_trades').delete().eq('portfolio_id', DEMO_PORTFOLIO_ID)
    
    const spyPrice = await this.getSPYPrice()
    
    await supabase
      .from('paper_portfolio')
      .update({
        cash_balance: INITIAL_BALANCE,
        total_value: INITIAL_BALANCE,
        total_return_pct: 0,
        benchmark_start_price: spyPrice,
        benchmark_return_pct: 0,
        win_rate: 0,
        total_trades: 0,
        winning_trades: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', DEMO_PORTFOLIO_ID)
  }
}