import { supabase } from '@/lib/supabase'
import type { Stock, AgentScore, Prediction, CatalystEvent, RecommendationHistory } from '@/types/database'

export type StockWithLatestData = Stock & {
  latestPrediction: Prediction | null
  agentScores: AgentScore[]
  recentCatalysts?: CatalystEvent[]
}

export type AnalysisDetail = Stock & {
  prediction: Prediction | null
  agentScores: AgentScore[]
  catalysts: CatalystEvent[]
  recommendationChanges: RecommendationHistory[]
}

export class StockAnalysisService {
  static async fetchStockList(): Promise<StockWithLatestData[]> {
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('*')
      .eq('is_active', true)
      .order('ticker')

    if (stocksError) throw stocksError
    if (!stocks) return []

    const stocksWithData = await Promise.all(
      stocks.map(async (stock: Stock) => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        
        const [predictionResult, scoresResult, catalystsResult] = await Promise.all([
          supabase
            .from('predictions')
            .select('*')
            .eq('stock_id', stock.id)
            .order('predicted_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('agent_scores')
            .select('*')
            .eq('stock_id', stock.id)
            .order('timestamp', { ascending: false })
            .limit(6),
          supabase
            .from('catalyst_events')
            .select('*')
            .eq('stock_id', stock.id)
            .gte('detected_at', oneDayAgo)
            .order('detected_at', { ascending: false })
            .limit(3)
        ])

        return {
          ...stock,
          latestPrediction: predictionResult.data as Prediction | null,
          agentScores: (scoresResult.data || []) as AgentScore[],
          recentCatalysts: (catalystsResult.data || []) as CatalystEvent[]
        }
      })
    )

    return stocksWithData
  }

  static async fetchStockAnalysis(ticker: string): Promise<AnalysisDetail | null> {
    const { data: stock, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .single()

    if (error || !stock) return null

    const typedStock = stock as Stock
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [predictionResult, scoresResult, catalystsResult, historyResult] = await Promise.all([
      supabase
        .from('predictions')
        .select('*')
        .eq('stock_id', typedStock.id)
        .order('predicted_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('agent_scores')
        .select('*')
        .eq('stock_id', typedStock.id)
        .order('timestamp', { ascending: false })
        .limit(6),
      supabase
        .from('catalyst_events')
        .select('*')
        .eq('stock_id', typedStock.id)
        .gte('detected_at', fourteenDaysAgo)
        .order('detected_at', { ascending: false }),
      supabase
        .from('recommendation_history')
        .select('*')
        .eq('stock_id', typedStock.id)
        .order('changed_at', { ascending: false })
        .limit(5)
    ])

    return {
      ...typedStock,
      prediction: predictionResult.data as Prediction | null,
      agentScores: (scoresResult.data || []) as AgentScore[],
      catalysts: (catalystsResult.data || []) as CatalystEvent[],
      recommendationChanges: (historyResult.data || []) as RecommendationHistory[]
    }
  }

  static async fetchPredictionHistory(ticker: string): Promise<Prediction[]> {
    const { data: stock } = await supabase
      .from('stocks')
      .select('id')
      .eq('ticker', ticker.toUpperCase())
      .single()

    if (!stock) return []

    const typedStock = stock as { id: string }

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('stock_id', typedStock.id)
      .order('predicted_at', { ascending: false })

    if (error) throw error
    return (data || []) as Prediction[]
  }

  static async fetchAllPredictions(): Promise<(Prediction & { stock: Stock })[]> {
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .order('predicted_at', { ascending: false })

    if (predError) throw predError
    if (!predictions) return []

    const { data: stocks } = await supabase.from('stocks').select('*')
    const stockMap = new Map((stocks as Stock[] || []).map(s => [s.id, s]))

    return (predictions as Prediction[]).map(p => ({
      ...p,
      stock: stockMap.get(p.stock_id)!
    })).filter(p => p.stock)
  }

  static async fetchCatalystsByStockId(stockId: string, days = 14): Promise<CatalystEvent[]> {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('catalyst_events')
      .select('*')
      .eq('stock_id', stockId)
      .gte('detected_at', sinceDate)
      .order('detected_at', { ascending: false })

    if (error) throw error
    return (data || []) as CatalystEvent[]
  }

  static async fetchRecommendationHistory(stockId: string, limit = 10): Promise<RecommendationHistory[]> {
    const { data, error } = await supabase
      .from('recommendation_history')
      .select('*')
      .eq('stock_id', stockId)
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []) as RecommendationHistory[]
  }
}