const FINNHUB_BASE = 'https://finnhub.io/api/v1'

export type NewsArticle = {
  headline: string
  summary: string
  source: string
  url: string
  datetime: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export type NewsSentiment = {
  ticker: string
  articlesAnalyzed: number
  bullishPercent: number
  bearishPercent: number
  buzz: { articlesInLastWeek: number; weeklyAverage: number }
  sectorAverageBullishPercent: number
  companyNewsScore: number
  recentArticles: NewsArticle[]
}

export type InsiderTransaction = {
  name: string
  share: number
  change: number
  filingDate: string
  transactionDate: string
  transactionCode: string
  transactionPrice: number | null
}

export type InsiderSentiment = {
  ticker: string
  mspr: number
  change: number
  transactions: InsiderTransaction[]
}

export type AnalystRecommendation = {
  period: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

export type EarningsCalendar = {
  date: string
  epsActual: number | null
  epsEstimate: number | null
  revenueActual: number | null
  revenueEstimate: number | null
  hour: 'bmo' | 'amc' | 'dmh' | null
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error('FINNHUB_API_KEY not configured')
  return key.replace(/^your_key=/, '')
}

async function finnhubRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${endpoint}`)
  url.searchParams.set('token', getApiKey())
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function getCompanyNews(ticker: string, daysBack: number = 7): Promise<NewsArticle[]> {
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const data = await finnhubRequest<{
    category?: string
    datetime?: number
    headline?: string
    id?: number
    image?: string
    related?: string
    source?: string
    summary?: string
    url?: string
  }[]>('/company-news', { symbol: ticker.toUpperCase(), from, to })

  return (data || []).slice(0, 15).map((article) => ({
    headline: article.headline || '',
    summary: article.summary || '',
    source: article.source || '',
    url: article.url || '',
    datetime: article.datetime ? new Date(article.datetime * 1000).toISOString() : '',
    sentiment: analyzeSentiment(article.headline || '', article.summary || '')
  }))
}

function analyzeSentiment(headline: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = `${headline} ${summary}`.toLowerCase()

  const positiveWords = ['surge', 'soar', 'jump', 'gain', 'rise', 'beat', 'upgrade', 'bullish', 'rally', 'growth', 'profit', 'record', 'breakthrough', 'strong', 'outperform', 'buy', 'boost']
  const negativeWords = ['fall', 'drop', 'plunge', 'decline', 'miss', 'downgrade', 'bearish', 'sell', 'loss', 'weak', 'cut', 'layoff', 'lawsuit', 'investigation', 'warning', 'concern', 'slump']

  const positiveCount = positiveWords.filter((w) => text.includes(w)).length
  const negativeCount = negativeWords.filter((w) => text.includes(w)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

export async function getNewsSentiment(ticker: string): Promise<NewsSentiment> {
  const [sentimentData, news] = await Promise.all([
    finnhubRequest<{
      buzz?: { articlesInLastWeek?: number; weeklyAverage?: number }
      companyNewsScore?: number
      sectorAverageBullishPercent?: number
      sentiment?: { bullishPercent?: number; bearishPercent?: number }
    }>('/news-sentiment', { symbol: ticker.toUpperCase() }),
    getCompanyNews(ticker, 14)
  ])

  return {
    ticker: ticker.toUpperCase(),
    articlesAnalyzed: sentimentData.buzz?.articlesInLastWeek ?? news.length,
    bullishPercent: sentimentData.sentiment?.bullishPercent ?? 0,
    bearishPercent: sentimentData.sentiment?.bearishPercent ?? 0,
    buzz: {
      articlesInLastWeek: sentimentData.buzz?.articlesInLastWeek ?? news.length,
      weeklyAverage: sentimentData.buzz?.weeklyAverage ?? 0
    },
    sectorAverageBullishPercent: sentimentData.sectorAverageBullishPercent ?? 0,
    companyNewsScore: sentimentData.companyNewsScore ?? 0,
    recentArticles: news.slice(0, 10)
  }
}

export async function getInsiderSentiment(ticker: string): Promise<InsiderSentiment> {
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const [sentimentData, transactionsData] = await Promise.all([
    finnhubRequest<{
      data?: { mspr?: number; change?: number }[]
    }>('/stock/insider-sentiment', { symbol: ticker.toUpperCase(), from, to }),
    finnhubRequest<{
      data?: {
        name?: string
        share?: number
        change?: number
        filingDate?: string
        transactionDate?: string
        transactionCode?: string
        transactionPrice?: number
      }[]
    }>('/stock/insider-transactions', { symbol: ticker.toUpperCase() })
  ])

  const latestSentiment = sentimentData.data?.slice(-1)[0]

  return {
    ticker: ticker.toUpperCase(),
    mspr: latestSentiment?.mspr ?? 0,
    change: latestSentiment?.change ?? 0,
    transactions: (transactionsData.data || []).slice(0, 20).map((t) => ({
      name: t.name || 'Unknown',
      share: t.share || 0,
      change: t.change || 0,
      filingDate: t.filingDate || '',
      transactionDate: t.transactionDate || '',
      transactionCode: t.transactionCode || '',
      transactionPrice: t.transactionPrice ?? null
    }))
  }
}

export async function getAnalystRecommendations(ticker: string): Promise<AnalystRecommendation[]> {
  const data = await finnhubRequest<{
    period?: string
    strongBuy?: number
    buy?: number
    hold?: number
    sell?: number
    strongSell?: number
  }[]>('/stock/recommendation', { symbol: ticker.toUpperCase() })

  return (data || []).slice(0, 6).map((r) => ({
    period: r.period || '',
    strongBuy: r.strongBuy || 0,
    buy: r.buy || 0,
    hold: r.hold || 0,
    sell: r.sell || 0,
    strongSell: r.strongSell || 0
  }))
}

export async function getEarningsCalendar(ticker: string): Promise<EarningsCalendar[]> {
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const data = await finnhubRequest<{
    earningsCalendar?: {
      date?: string
      epsActual?: number
      epsEstimate?: number
      revenueActual?: number
      revenueEstimate?: number
      hour?: string
      symbol?: string
    }[]
  }>('/calendar/earnings', { from, to, symbol: ticker.toUpperCase() })

  return (data.earningsCalendar || [])
    .filter((e) => e.symbol?.toUpperCase() === ticker.toUpperCase())
    .map((e) => ({
      date: e.date || '',
      epsActual: e.epsActual ?? null,
      epsEstimate: e.epsEstimate ?? null,
      revenueActual: e.revenueActual ?? null,
      revenueEstimate: e.revenueEstimate ?? null,
      hour: (e.hour as 'bmo' | 'amc' | 'dmh') ?? null
    }))
}

export async function getUpgrades(ticker: string): Promise<{ date: string; company: string; from: string; to: string; action: string }[]> {
  const data = await finnhubRequest<{
    gradeTime?: number
    company?: string
    fromGrade?: string
    toGrade?: string
    action?: string
  }[]>('/stock/upgrade-downgrade', { symbol: ticker.toUpperCase() })

  return (data || []).slice(0, 10).map((u) => ({
    date: u.gradeTime ? new Date(u.gradeTime * 1000).toISOString().split('T')[0] : '',
    company: u.company || '',
    from: u.fromGrade || '',
    to: u.toGrade || '',
    action: u.action || ''
  }))
}
