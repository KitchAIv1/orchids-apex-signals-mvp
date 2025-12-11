'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockAnalysisService, type StockWithLatestData } from '@/services/StockAnalysisService'

export function useStockData() {
  const [stocks, setStocks] = useState<StockWithLatestData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await StockAnalysisService.fetchStockList()
      setStocks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stocks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  return { stocks, loading, error, refetch: fetchStocks }
}
