import { supabase } from '@/lib/supabase'
import type { RecommendationHistory } from '@/types/database'

export type CatalystUpdate = RecommendationHistory & {
  ticker: string
  scoreChange: number
  isUpgrade: boolean
}

export async function fetchCatalystUpdates(stockIds?: string[]): Promise<CatalystUpdate[]> {
  let query = supabase
    .from('recommendation_history')
    .select('*, stocks!inner(ticker)')
    .order('changed_at', { ascending: false })
    .limit(50)

  if (stockIds && stockIds.length > 0) {
    query = query.in('stock_id', stockIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch catalyst updates:', error)
    return []
  }

  return (data || []).map(row => {
    const previousScore = row.previous_score ?? 0
    const newScore = row.new_score ?? 0
    const scoreChange = newScore - previousScore
    const stockRecord = row.stocks as unknown as { ticker: string }

    return {
      id: row.id,
      stock_id: row.stock_id,
      previous_recommendation: row.previous_recommendation,
      new_recommendation: row.new_recommendation,
      previous_score: row.previous_score,
      new_score: row.new_score,
      change_reason: row.change_reason,
      changed_at: row.changed_at,
      ticker: stockRecord?.ticker ?? 'UNKNOWN',
      scoreChange,
      isUpgrade: scoreChange > 0
    }
  })
}

export async function fetchCatalystUpdatesForStock(stockId: string): Promise<CatalystUpdate[]> {
  return fetchCatalystUpdates([stockId])
}

export function hasRecentCatalyst(
  catalysts: CatalystUpdate[],
  stockId: string,
  withinHours = 24
): boolean {
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000)
  return catalysts.some(
    c => c.stock_id === stockId && new Date(c.changed_at) > cutoff
  )
}

export function getMostRecentCatalyst(
  catalysts: CatalystUpdate[],
  stockId: string
): CatalystUpdate | null {
  return catalysts.find(c => c.stock_id === stockId) ?? null
}
