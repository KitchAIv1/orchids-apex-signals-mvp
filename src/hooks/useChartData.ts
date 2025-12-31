'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchHistoricalData, type OHLCData, type ChartTimeframe } from '@/services/ChartDataService'

type ChartDataState = {
  ohlcData: OHLCData[]
  loading: boolean
  error: string | null
  timeframe: ChartTimeframe
}

export function useChartData(ticker: string | null) {
  const [state, setState] = useState<ChartDataState>({
    ohlcData: [],
    loading: false,
    error: null,
    timeframe: '3M'
  })

  const fetchData = useCallback(async (symbol: string, tf: ChartTimeframe) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const historicalData = await fetchHistoricalData(symbol, tf)
      setState(prev => ({
        ...prev,
        ohlcData: historicalData,
        loading: false
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch chart data',
        loading: false
      }))
    }
  }, [])

  useEffect(() => {
    if (ticker) {
      fetchData(ticker, state.timeframe)
    }
  }, [ticker, state.timeframe, fetchData])

  const setTimeframe = useCallback((tf: ChartTimeframe) => {
    setState(prev => ({ ...prev, timeframe: tf }))
  }, [])

  const refetch = useCallback(() => {
    if (ticker) {
      fetchData(ticker, state.timeframe)
    }
  }, [ticker, state.timeframe, fetchData])

  return {
    ohlcData: state.ohlcData,
    loading: state.loading,
    error: state.error,
    timeframe: state.timeframe,
    setTimeframe,
    refetch
  }
}

