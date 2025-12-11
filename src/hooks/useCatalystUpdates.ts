'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  fetchCatalystUpdates,
  hasRecentCatalyst,
  getMostRecentCatalyst,
  type CatalystUpdate
} from '@/services/RecommendationHistoryService'

type UseCatalystUpdatesResult = {
  catalysts: CatalystUpdate[]
  loading: boolean
  error: string | null
  hasRecent: (stockId: string, withinHours?: number) => boolean
  getLatest: (stockId: string) => CatalystUpdate | null
  refetch: () => Promise<void>
}

export function useCatalystUpdates(stockIds?: string[]): UseCatalystUpdatesResult {
  const [catalysts, setCatalysts] = useState<CatalystUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCatalysts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCatalystUpdates(stockIds)
      setCatalysts(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalysts')
    } finally {
      setLoading(false)
    }
  }, [stockIds])

  useEffect(() => {
    loadCatalysts()
  }, [loadCatalysts])

  const hasRecent = useCallback(
    (stockId: string, withinHours = 24) => hasRecentCatalyst(catalysts, stockId, withinHours),
    [catalysts]
  )

  const getLatest = useCallback(
    (stockId: string) => getMostRecentCatalyst(catalysts, stockId),
    [catalysts]
  )

  return { catalysts, loading, error, hasRecent, getLatest, refetch: loadCatalysts }
}
