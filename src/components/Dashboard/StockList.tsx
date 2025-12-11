'use client'

import { useState, useMemo } from 'react'
import { useStockData } from '@/hooks/useStockData'
import { useStockPrices } from '@/hooks/useStockPrices'
import { useRecentCatalysts } from '@/hooks/useRecentCatalysts'
import { StockCard } from './StockCard'
import { FilterBar } from './FilterBar'
import { Skeleton } from '@/components/ui/skeleton'

export function StockList() {
  const { stocks, loading, error } = useStockData()
  const [selectedSector, setSelectedSector] = useState('all')
  const [selectedRecommendation, setSelectedRecommendation] = useState('all')

  const symbols = useMemo(() => stocks.map(s => s.ticker), [stocks])
  const { prices } = useStockPrices(symbols)
  const { catalysts } = useRecentCatalysts(24)

  const catalystsByTicker = useMemo(() => {
    const tickerMap = new Map<string, { hasRecent: boolean; urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>()
    for (const catalyst of catalysts) {
      const existing = tickerMap.get(catalyst.ticker)
      if (!existing) {
        tickerMap.set(catalyst.ticker, { hasRecent: true, urgency: catalyst.urgency })
      } else {
        const urgencyRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        if (urgencyRank[catalyst.urgency] > urgencyRank[existing.urgency]) {
          tickerMap.set(catalyst.ticker, { hasRecent: true, urgency: catalyst.urgency })
        }
      }
    }
    return tickerMap
  }, [catalysts])

  const sectors = useMemo(() => {
    const sectorSet = new Set(stocks.map(s => s.sector).filter(Boolean) as string[])
    return Array.from(sectorSet).sort()
  }, [stocks])

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      if (selectedSector !== 'all' && stock.sector !== selectedSector) return false
      if (selectedRecommendation !== 'all') {
        const rec = stock.latestPrediction?.recommendation
        if (rec !== selectedRecommendation) return false
      }
      return true
    })
  }, [stocks, selectedSector, selectedRecommendation])

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
        <p className="text-rose-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FilterBar
        sectors={sectors}
        selectedSector={selectedSector}
        selectedRecommendation={selectedRecommendation}
        onSectorChange={setSelectedSector}
        onRecommendationChange={setSelectedRecommendation}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-2xl bg-zinc-800/50" />
          ))}
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">No stocks match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStocks.map(stock => {
            const catalystInfo = catalystsByTicker.get(stock.ticker)
            return (
              <StockCard 
                key={stock.id} 
                stock={stock} 
                price={prices[stock.ticker]}
                hasRecentCatalyst={catalystInfo?.hasRecent}
                catalystUrgency={catalystInfo?.urgency}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
