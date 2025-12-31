import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, sanitizeTicker } from '@/lib/security'

export type OHLCData = {
  time: string | number  // string for daily, number (unix timestamp) for intraday
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type TimeframeConfig = { interval: string; range: string }

const TIMEFRAME_CONFIG: Record<string, TimeframeConfig> = {
  '1D': { interval: '5m', range: '1d' },
  '1W': { interval: '15m', range: '5d' },
  '1M': { interval: '1h', range: '1mo' },
  '3M': { interval: '1d', range: '3mo' },
  '6M': { interval: '1d', range: '6mo' },
  '1Y': { interval: '1d', range: '1y' }
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests/min per IP
  const rateLimitError = withRateLimit(request, 'chart-data')
  if (rateLimitError) return rateLimitError

  const { searchParams } = new URL(request.url)
  const rawTicker = searchParams.get('ticker')
  const timeframe = searchParams.get('timeframe') || '3M'

  // Sanitize ticker input
  const ticker = sanitizeTicker(rawTicker)
  if (!ticker) {
    return NextResponse.json({ error: 'Valid ticker required' }, { status: 400 })
  }

  const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['3M']

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${config.interval}&range=${config.range}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${response.status}` },
        { status: response.status }
      )
    }

    const yahooData = await response.json()

    if (!yahooData.chart?.result?.[0]) {
      return NextResponse.json({ error: 'No data available', data: [] })
    }

    const result = yahooData.chart.result[0]
    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}

    const ohlcData: OHLCData[] = timestamps
      .map((ts: number, i: number) => ({
        time: formatTimestamp(ts, config.interval),
        open: quotes.open?.[i] ?? 0,
        high: quotes.high?.[i] ?? 0,
        low: quotes.low?.[i] ?? 0,
        close: quotes.close?.[i] ?? 0,
        volume: quotes.volume?.[i] ?? 0
      }))
      .filter((candle: OHLCData) => candle.close > 0)

    return NextResponse.json({ data: ohlcData })
  } catch (error) {
    console.error(`Chart data fetch error for ${ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

function formatTimestamp(ts: number, interval: string): string | number {
  // For intraday intervals, return Unix timestamp in seconds
  if (interval.includes('m') || interval === '1h') {
    return ts  // Already in seconds from Yahoo Finance
  }
  
  // For daily intervals, return YYYY-MM-DD string
  const date = new Date(ts * 1000)
  return date.toISOString().split('T')[0]
}

