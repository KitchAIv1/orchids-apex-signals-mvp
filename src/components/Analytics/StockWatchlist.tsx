'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Search } from 'lucide-react'
import type { SelectedStockState } from '@/hooks/useSelectedStock'

type StockWithPrice = {
  id: string
  ticker: string
  companyName: string
  price: number | null
  changePercent: number | null
  recommendation: string | null
  finalScore: number | null
}

type Props = {
  selectedTicker: string | null
  onSelectStock: (stock: SelectedStockState) => void
}

export function StockWatchlist({ selectedTicker, onSelectStock }: Props) {
  const [stocks, setStocks] = useState<StockWithPrice[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStocksWithPredictions()
  }, [])

  async function fetchStocksWithPredictions() {
    setLoading(true)
    const { data: stocksData } = await supabase
      .from('stocks')
      .select('id, ticker, company_name')
      .eq('is_active', true)
      .order('ticker')

    const { data: predictions } = await supabase
      .from('predictions')
      .select('stock_id, recommendation, final_score, price_at_prediction')
      .order('predicted_at', { ascending: false })

    const predictionMap = new Map(
      (predictions || []).map(p => [p.stock_id, p])
    )

    const stockList: StockWithPrice[] = (stocksData || []).map(s => {
      const pred = predictionMap.get(s.id)
      return {
        id: s.id,
        ticker: s.ticker,
        companyName: s.company_name || s.ticker,
        price: pred?.price_at_prediction || null,
        changePercent: null,
        recommendation: pred?.recommendation || null,
        finalScore: pred?.final_score || null
      }
    })

    setStocks(stockList)
    setLoading(false)

    if (stockList.length > 0 && !selectedTicker) {
      onSelectStock({
        ticker: stockList[0].ticker,
        companyName: stockList[0].companyName,
        stockId: stockList[0].id
      })
    }
  }

  const filteredStocks = stocks.filter(s =>
    s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-zinc-500 text-sm">Loading...</div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">No stocks found</div>
        ) : (
          filteredStocks.map(stock => (
            <StockListItem
              key={stock.id}
              stock={stock}
              isSelected={selectedTicker === stock.ticker}
              onSelect={() => onSelectStock({
                ticker: stock.ticker,
                companyName: stock.companyName,
                stockId: stock.id
              })}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StockListItem({ 
  stock, 
  isSelected, 
  onSelect 
}: { 
  stock: StockWithPrice
  isSelected: boolean
  onSelect: () => void 
}) {
  const scoreColor = stock.finalScore !== null
    ? stock.finalScore > 30 ? 'text-emerald-400'
    : stock.finalScore < -30 ? 'text-rose-400'
    : 'text-amber-400'
    : 'text-zinc-500'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors',
        'hover:bg-zinc-900/80 border-l-2',
        isSelected 
          ? 'bg-zinc-900 border-l-violet-500' 
          : 'border-l-transparent'
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm text-zinc-100">
            {stock.ticker}
          </span>
          {stock.finalScore !== null && (
            <ConvictionBadge score={stock.finalScore} />
          )}
        </div>
        <p className="text-[11px] text-zinc-500 truncate">{stock.companyName}</p>
      </div>

      <div className="text-right flex-shrink-0 ml-2">
        {stock.price !== null && (
          <p className="text-sm font-medium text-zinc-200 tabular-nums">
            ${stock.price.toFixed(2)}
          </p>
        )}
        {stock.finalScore !== null && (
          <p className={cn('text-[10px] tabular-nums flex items-center justify-end gap-0.5', scoreColor)}>
            {stock.finalScore > 0 && <TrendingUp className="h-2.5 w-2.5" />}
            {stock.finalScore < 0 && <TrendingDown className="h-2.5 w-2.5" />}
            {stock.finalScore > 0 ? '+' : ''}{stock.finalScore.toFixed(0)}
          </p>
        )}
      </div>
    </button>
  )
}

function ConvictionBadge({ score }: { score: number | null }) {
  // Derive conviction from SCORE (not legacy recommendation)
  // Score scale: -100 to +100
  // Bullish: > +30, Neutral: -30 to +30, Bearish: < -30
  const conviction = score === null ? 'Neutral'
    : score > 30 ? 'Bullish'
    : score < -30 ? 'Bearish'
    : 'Neutral'

  const badgeClasses = conviction === 'Bullish' 
    ? 'bg-emerald-500/20 text-emerald-400'
    : conviction === 'Bearish' 
    ? 'bg-rose-500/20 text-rose-400'
    : 'bg-amber-500/20 text-amber-400'

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', badgeClasses)}>
      {conviction}
    </span>
  )
}

