'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockAnalysisService } from '@/services/StockAnalysisService'
import type { CatalystEvent, RecommendationHistory } from '@/types/database'

type UseCatalystEventsReturn = {
  catalysts: CatalystEvent[]
  recommendationChanges: RecommendationHistory[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCatalystEvents(stockId?: string): UseCatalystEventsReturn {
  const [catalysts, setCatalysts] = useState<CatalystEvent[]>([])
  const [recommendationChanges, setRecommendationChanges] = useState<RecommendationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCatalystData = useCallback(async () => {
    if (!stockId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [catalystData, historyData] = await Promise.all([
        StockAnalysisService.fetchCatalystsByStockId(stockId, 14),
        StockAnalysisService.fetchRecommendationHistory(stockId, 5)
      ])

      setCatalysts(catalystData)
      setRecommendationChanges(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch catalyst data')
    } finally {
      setLoading(false)
    }
  }, [stockId])

  useEffect(() => {
    fetchCatalystData()
  }, [fetchCatalystData])

  return { catalysts, recommendationChanges, loading, error, refetch: fetchCatalystData }
}
