import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, validateTickers } from '@/lib/security'

const FINNHUB_API_KEY = (() => {
  const raw = process.env.FINNHUB_API_KEY || ''
  const parts = raw.split('=')
  return parts.length > 1 ? parts[parts.length - 1] : raw
})()
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

type FinnhubQuote = {
  c: number  // current price
  d: number  // change
  dp: number // percent change
  h: number  // high
  l: number  // low
  o: number  // open
  pc: number // previous close
  t: number  // timestamp
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests/min per IP
  const rateLimitError = withRateLimit(request, 'stock-price')
  if (rateLimitError) return rateLimitError

  const searchParams = request.nextUrl.searchParams
  const symbols = searchParams.get('symbols')

  if (!symbols) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
  }

  // Validate and sanitize ticker symbols
  const symbolList = validateTickers(symbols)
  if (!symbolList) {
    return NextResponse.json({ error: 'Invalid symbols (max 20 allowed)' }, { status: 400 })
  }

  try {
    const quotes = await Promise.all(
      symbolList.map(async (symbol) => {
        const response = await fetch(
          `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
          { next: { revalidate: 60 } }
        )
        
        if (!response.ok) {
          return { symbol, error: 'Failed to fetch' }
        }
        
        const data: FinnhubQuote = await response.json()
        
        if (data.c === 0 && data.d === 0) {
          return { symbol, error: 'No data available' }
        }
        
        return {
          symbol,
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
        }
      })
    )

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Finnhub API error:', error)
    return NextResponse.json({ error: 'Failed to fetch stock prices' }, { status: 500 })
  }
}