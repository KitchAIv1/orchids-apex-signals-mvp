const RAPIDAPI_HOST = 'apidojo-yahoo-finance-v1.p.rapidapi.com'
const YAHOO_QUERY_HOST = 'query1.finance.yahoo.com'

export type StockQuote = {
  symbol: string
  price: number
  change: number
  changePercent: number
  marketCap: number
  volume: number
  avgVolume: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  fiftyDayAvg: number
  twoHundredDayAvg: number
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED' | 'PREPRE' | 'POSTPOST'
  preMarketPrice: number | null
  preMarketChange: number | null
  preMarketChangePercent: number | null
  postMarketPrice: number | null
  postMarketChange: number | null
  postMarketChangePercent: number | null
}

export type StockFundamentals = {
  ticker: string
  peRatio: number | null
  forwardPE: number | null
  pegRatio: number | null
  priceToBook: number | null
  priceToSales: number | null
  evToEbitda: number | null
  revenueGrowth: number | null
  earningsGrowth: number | null
  profitMargin: number | null
  operatingMargin: number | null
  grossMargin: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  debtToEquity: number | null
  currentRatio: number | null
  freeCashFlow: number | null
  dividendYield: number | null
  beta: number | null
}

export type TechnicalData = {
  ticker: string
  currentPrice: number
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
  priceHistory: { date: string; close: number; volume: number }[]
  support: number | null
  resistance: number | null
}

function getApiKey(): string | null {
  const key = process.env.YAHOO_FINANCE_API_KEY
  if (!key) return null
  const cleaned = key.replace(/^your_key=/, '')
  return cleaned
}

async function yahooQueryRequest(ticker: string): Promise<unknown> {
  const url = `https://${YAHOO_QUERY_HOST}/v8/finance/chart/${ticker}?interval=1d&range=6mo`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`Yahoo query error: ${response.status}`)
  return response.json()
}

async function yahooQuoteSummary(ticker: string, modules: string): Promise<unknown> {
  const url = `https://${YAHOO_QUERY_HOST}/v10/finance/quoteSummary/${ticker}?modules=${modules}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`Yahoo summary error: ${response.status}`)
  return response.json()
}

async function yahooRequest(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('YAHOO_FINANCE_API_KEY not configured')

  const url = new URL(`https://${RAPIDAPI_HOST}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST
    }
  })

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  try {
    const url = `https://${YAHOO_QUERY_HOST}/v6/finance/quote?symbols=${ticker.toUpperCase()}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    
    if (!response.ok) throw new Error(`Yahoo quote error: ${response.status}`)
    
    const data = await response.json() as {
      quoteResponse?: {
        result?: {
          symbol?: string
          regularMarketPrice?: number
          regularMarketChange?: number
          regularMarketChangePercent?: number
          marketCap?: number
          regularMarketVolume?: number
          averageDailyVolume3Month?: number
          fiftyTwoWeekHigh?: number
          fiftyTwoWeekLow?: number
          fiftyDayAverage?: number
          twoHundredDayAverage?: number
          marketState?: string
          preMarketPrice?: number
          preMarketChange?: number
          preMarketChangePercent?: number
          postMarketPrice?: number
          postMarketChange?: number
          postMarketChangePercent?: number
        }[]
      }
    }

    const quote = data.quoteResponse?.result?.[0]
    if (!quote) throw new Error(`No quote data for ${ticker}`)

    const marketState = (quote.marketState || 'CLOSED') as StockQuote['marketState']

    return {
      symbol: quote.symbol || ticker.toUpperCase(),
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      marketCap: quote.marketCap || 0,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume3Month || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      fiftyDayAvg: quote.fiftyDayAverage || 0,
      twoHundredDayAvg: quote.twoHundredDayAverage || 0,
      marketState,
      preMarketPrice: quote.preMarketPrice ?? null,
      preMarketChange: quote.preMarketChange ?? null,
      preMarketChangePercent: quote.preMarketChangePercent ?? null,
      postMarketPrice: quote.postMarketPrice ?? null,
      postMarketChange: quote.postMarketChange ?? null,
      postMarketChangePercent: quote.postMarketChangePercent ?? null
    }
  } catch {
    const data = await yahooRequest('/market/v2/get-quotes', {
      region: 'US',
      symbols: ticker.toUpperCase()
    }) as { quoteResponse?: { result?: Record<string, unknown>[] } }

    const quote = data.quoteResponse?.result?.[0]
    if (!quote) throw new Error(`No quote data for ${ticker}`)

    const marketState = (String(quote.marketState || 'CLOSED')) as StockQuote['marketState']

    return {
      symbol: String(quote.symbol || ticker),
      price: Number(quote.regularMarketPrice) || 0,
      change: Number(quote.regularMarketChange) || 0,
      changePercent: Number(quote.regularMarketChangePercent) || 0,
      marketCap: Number(quote.marketCap) || 0,
      volume: Number(quote.regularMarketVolume) || 0,
      avgVolume: Number(quote.averageDailyVolume3Month) || 0,
      fiftyTwoWeekHigh: Number(quote.fiftyTwoWeekHigh) || 0,
      fiftyTwoWeekLow: Number(quote.fiftyTwoWeekLow) || 0,
      fiftyDayAvg: Number(quote.fiftyDayAverage) || 0,
      twoHundredDayAvg: Number(quote.twoHundredDayAverage) || 0,
      marketState,
      preMarketPrice: quote.preMarketPrice ? Number(quote.preMarketPrice) : null,
      preMarketChange: quote.preMarketChange ? Number(quote.preMarketChange) : null,
      preMarketChangePercent: quote.preMarketChangePercent ? Number(quote.preMarketChangePercent) : null,
      postMarketPrice: quote.postMarketPrice ? Number(quote.postMarketPrice) : null,
      postMarketChange: quote.postMarketChange ? Number(quote.postMarketChange) : null,
      postMarketChangePercent: quote.postMarketChangePercent ? Number(quote.postMarketChangePercent) : null
    }
  }
}

export async function getStockFundamentals(ticker: string): Promise<StockFundamentals> {
  const emptyResult: StockFundamentals = {
    ticker: ticker.toUpperCase(),
    peRatio: null,
    forwardPE: null,
    pegRatio: null,
    priceToBook: null,
    priceToSales: null,
    evToEbitda: null,
    revenueGrowth: null,
    earningsGrowth: null,
    profitMargin: null,
    operatingMargin: null,
    grossMargin: null,
    returnOnEquity: null,
    returnOnAssets: null,
    debtToEquity: null,
    currentRatio: null,
    freeCashFlow: null,
    dividendYield: null,
    beta: null
  }

  try {
    const alphaKey = process.env.ALPHA_VANTAGE_API_KEY?.replace(/^your_key=/, '')
    if (!alphaKey) {
      console.warn('ALPHA_VANTAGE_API_KEY not configured')
      return emptyResult
    }

    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker.toUpperCase()}&apikey=${alphaKey}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Alpha Vantage error: ${response.status}`)
    
    const data = await response.json() as Record<string, string>
    
    if (!data.Symbol) {
      console.warn(`No Alpha Vantage data for ${ticker}`)
      return emptyResult
    }

    const parseNum = (val: string | undefined): number | null => {
      if (!val || val === 'None' || val === '-') return null
      const num = parseFloat(val)
      return isNaN(num) ? null : num
    }

    return {
      ticker: ticker.toUpperCase(),
      peRatio: parseNum(data.TrailingPE) ?? parseNum(data.PERatio),
      forwardPE: parseNum(data.ForwardPE),
      pegRatio: parseNum(data.PEGRatio),
      priceToBook: parseNum(data.PriceToBookRatio),
      priceToSales: parseNum(data.PriceToSalesRatioTTM),
      evToEbitda: parseNum(data.EVToEBITDA),
      revenueGrowth: parseNum(data.QuarterlyRevenueGrowthYOY),
      earningsGrowth: parseNum(data.QuarterlyEarningsGrowthYOY),
      profitMargin: parseNum(data.ProfitMargin),
      operatingMargin: parseNum(data.OperatingMarginTTM),
      grossMargin: null,
      returnOnEquity: parseNum(data.ReturnOnEquityTTM),
      returnOnAssets: parseNum(data.ReturnOnAssetsTTM),
      debtToEquity: null,
      currentRatio: null,
      freeCashFlow: null,
      dividendYield: parseNum(data.DividendYield),
      beta: parseNum(data.Beta)
    }
  } catch (error) {
    console.warn(`Failed to fetch fundamentals for ${ticker}:`, error)
    return emptyResult
  }
}

export async function getHistoricalPrices(
  ticker: string,
  period: '1mo' | '3mo' | '6mo' | '1y' = '3mo'
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  const data = await yahooQueryRequest(ticker.toUpperCase()) as {
    chart?: {
      result?: {
        timestamp?: number[]
        indicators?: {
          quote?: { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }[]
        }
      }[]
    }
  }

  const result = data.chart?.result?.[0]
  const timestamps = result?.timestamp || []
  const quote = result?.indicators?.quote?.[0] || {}

  const cutoffDays = period === '1mo' ? 30 : period === '3mo' ? 90 : period === '6mo' ? 180 : 365
  const cutoffDate = Date.now() - cutoffDays * 24 * 60 * 60 * 1000

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      timestamp: ts * 1000,
      open: quote.open?.[i] || 0,
      high: quote.high?.[i] || 0,
      low: quote.low?.[i] || 0,
      close: quote.close?.[i] || 0,
      volume: quote.volume?.[i] || 0
    }))
    .filter((p) => p.timestamp > cutoffDate && p.close > 0)
    .map(({ timestamp: _, ...rest }) => rest)
}

function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null

  const changes = prices.slice(-period - 1).map((_, i, arr) => (i === 0 ? 0 : arr[i] - arr[i - 1])).slice(1)
  const gains = changes.filter((c) => c > 0)
  const losses = changes.filter((c) => c < 0).map((c) => Math.abs(c))

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } | null {
  if (prices.length < 26) return null

  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  if (ema12 === null || ema26 === null) return null

  const line = ema12 - ema26
  const macdValues: number[] = []
  for (let i = 26; i <= prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i), 12)
    const e26 = calculateEMA(prices.slice(0, i), 26)
    if (e12 !== null && e26 !== null) macdValues.push(e12 - e26)
  }

  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : null
  if (signal === null) return null

  return { line, signal, histogram: line - signal }
}

function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }
  return ema
}

export async function getTechnicalData(ticker: string): Promise<TechnicalData> {
  const [quote, history] = await Promise.all([
    getStockQuote(ticker),
    getHistoricalPrices(ticker, '6mo')
  ])

  const closes = history.map((h) => h.close)
  const macd = calculateMACD(closes)

  const recentLows = closes.slice(-20)
  const recentHighs = closes.slice(-20)

  return {
    ticker: ticker.toUpperCase(),
    currentPrice: quote.price,
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    rsi14: calculateRSI(closes, 14),
    macdLine: macd?.line ?? null,
    macdSignal: macd?.signal ?? null,
    macdHistogram: macd?.histogram ?? null,
    priceHistory: history.slice(-60).map((h) => ({ date: h.date, close: h.close, volume: h.volume })),
    support: recentLows.length > 0 ? Math.min(...recentLows) : null,
    resistance: recentHighs.length > 0 ? Math.max(...recentHighs) : null
  }
}