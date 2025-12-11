'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockAnalysisService } from '@/services/StockAnalysisService'
import type { Prediction, Stock } from '@/types/database'

export function usePredictions(ticker?: string) {
  const [predictions, setPredictions] = useState<(Prediction & { stock?: Stock })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (ticker) {
        const data = await StockAnalysisService.fetchPredictionHistory(ticker)
        setPredictions(data)
      } else {
        const data = await StockAnalysisService.fetchAllPredictions()
        setPredictions(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions])

  return { predictions, loading, error, refetch: fetchPredictions }
}
