'use client'

import { useState, useEffect, useCallback } from 'react'

export type StockPrice = {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  error?: string
}

type PriceMap = Record<string, StockPrice>

export function useStockPrices(symbols: string[]) {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/stock-price?symbols=${symbols.join(',')}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      
      const data = await response.json()
      
      const priceMap: PriceMap = {}
      for (const quote of data.quotes) {
        if (!quote.error) {
          priceMap[quote.symbol] = quote
        }
      }
      
      setPrices(priceMap)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
    } finally {
      setLoading(false)
    }
  }, [symbols])

  useEffect(() => {
    fetchPrices()
    
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  return { prices, loading, error, refetch: fetchPrices }
}
