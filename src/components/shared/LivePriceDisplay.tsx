'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { StockPrice } from '@/hooks/useStockPrices'

type Props = {
  price: StockPrice
}

function formatPriceValue(priceValue: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceValue)
}

function formatPricePercent(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

export function LivePriceDisplay({ price }: Props) {
  const isPositive = price.change >= 0
  const isNegative = price.change < 0

  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-lg font-bold text-zinc-100 tracking-tight tabular-nums">
          {formatPriceValue(price.price)}
        </p>
      </div>
      <div className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-md',
        isPositive && 'bg-emerald-500/10',
        isNegative && 'bg-rose-500/10',
        !isPositive && !isNegative && 'bg-zinc-800/50'
      )}>
        {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
        {isNegative && <TrendingDown className="w-3 h-3 text-rose-400" />}
        {!isPositive && !isNegative && <Minus className="w-3 h-3 text-zinc-500" />}
        <span className={cn(
          'text-xs font-semibold tabular-nums',
          isPositive && 'text-emerald-400',
          isNegative && 'text-rose-400',
          !isPositive && !isNegative && 'text-zinc-500'
        )}>
          {formatPricePercent(price.changePercent)}
        </span>
      </div>
    </div>
  )
}
