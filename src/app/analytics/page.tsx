'use client'

import { Navbar } from '@/components/shared/Navbar'
import { StockWatchlist } from '@/components/Analytics/StockWatchlist'
import { TradingChart } from '@/components/Analytics/TradingChart'
import { IndicatorPanel } from '@/components/Analytics/IndicatorPanel'
import { useSelectedStock } from '@/hooks/useSelectedStock'

export default function AnalyticsPage() {
  const { selectedStock, selectStock } = useSelectedStock()

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Stock Watchlist */}
        <div className="w-64 flex-shrink-0">
          <StockWatchlist
            selectedTicker={selectedStock?.ticker || null}
            onSelectStock={selectStock}
          />
        </div>

        {/* Center: TradingView Chart */}
        <TradingChart
          ticker={selectedStock?.ticker || null}
          companyName={selectedStock?.companyName || ''}
        />

        {/* Right: Indicator Panel */}
        <IndicatorPanel
          ticker={selectedStock?.ticker || null}
          stockId={selectedStock?.stockId || null}
        />
      </div>
    </div>
  )
}

