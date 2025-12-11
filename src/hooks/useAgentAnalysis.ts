'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockAnalysisService, type AnalysisDetail } from '@/services/StockAnalysisService'

export function useAgentAnalysis(ticker: string | null) {
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    if (!ticker) {
      setAnalysis(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await StockAnalysisService.fetchStockAnalysis(ticker)
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  return { analysis, loading, error, refetch: fetchAnalysis }
}
