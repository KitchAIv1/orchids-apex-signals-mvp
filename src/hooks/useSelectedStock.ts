'use client'

import { useState, useCallback } from 'react'

export type SelectedStockState = {
  ticker: string
  companyName: string
  stockId: string
}

export function useSelectedStock(initialTicker?: string) {
  const [selectedStock, setSelectedStock] = useState<SelectedStockState | null>(
    initialTicker ? { ticker: initialTicker, companyName: '', stockId: '' } : null
  )

  const selectStock = useCallback((stock: SelectedStockState) => {
    setSelectedStock(stock)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStock(null)
  }, [])

  return {
    selectedStock,
    selectStock,
    clearSelection,
    haSelection: selectedStock !== null
  }
}

