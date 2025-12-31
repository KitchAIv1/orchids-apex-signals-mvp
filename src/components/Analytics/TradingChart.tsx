'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type ISeriesApi, ColorType, CandlestickSeries } from 'lightweight-charts'
import { useChartData } from '@/hooks/useChartData'
import { cn } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'
import type { ChartTimeframe } from '@/services/ChartDataService'

type Props = {
  ticker: string | null
  companyName: string
}

const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y']

export function TradingChart({ ticker, companyName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick', string> | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)

  const { ohlcData, loading, error, timeframe, setTimeframe, refetch } = useChartData(ticker)

  useEffect(() => {
    if (!containerRef.current || !ticker) return

    const container = containerRef.current
    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 400,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa'
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' }
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#6366f1', width: 1, style: 2 },
        horzLine: { color: '#6366f1', width: 1, style: 2 }
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: { top: 0.1, bottom: 0.1 }
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: true }
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    })

    chartRef.current = chart
    seriesRef.current = candleSeries

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height })
        }
      }
    })

    resizeObserver.observe(container)
    setIsChartReady(true)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      setIsChartReady(false)
    }
  }, [ticker])

  useEffect(() => {
    if (!isChartReady || !seriesRef.current || ohlcData.length === 0) return

    const formattedData = ohlcData.map(candle => ({
      time: candle.time as string,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }))

    seriesRef.current.setData(formattedData)
    chartRef.current?.timeScale().fitContent()
  }, [ohlcData, isChartReady])

  if (!ticker) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500">
        Select a stock to view chart
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950">
      <ChartHeader
        ticker={ticker}
        companyName={companyName}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onRefresh={refetch}
        loading={loading}
      />

      <div className="flex-1 relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <p className="text-rose-400">{error}</p>
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}

function ChartHeader({
  ticker,
  companyName,
  timeframe,
  onTimeframeChange,
  onRefresh,
  loading
}: {
  ticker: string
  companyName: string
  timeframe: ChartTimeframe
  onTimeframeChange: (tf: ChartTimeframe) => void
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">{ticker}</h2>
        <p className="text-xs text-zinc-500">{companyName}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                timeframe === tf
                  ? 'bg-violet-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4 text-zinc-400', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  )
}

