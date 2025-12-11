import { getStockQuote, getStockFundamentals, getTechnicalData, type StockQuote, type StockFundamentals, type TechnicalData } from './YahooFinanceService'
import { getNewsSentiment, getInsiderSentiment, getAnalystRecommendations, getEarningsCalendar, getUpgrades, type NewsSentiment, type InsiderSentiment, type AnalystRecommendation, type EarningsCalendar } from './FinnhubService'
import { getMacroIndicators, formatMacroSummary, getMacroSignal, type MacroIndicators } from './FREDService'

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

const CACHE_DURATIONS = {
  quote: 5 * 60 * 1000,
  fundamentals: 60 * 60 * 1000,
  technical: 15 * 60 * 1000,
  news: 30 * 60 * 1000,
  insider: 60 * 60 * 1000,
  macro: 4 * 60 * 60 * 1000,
  analyst: 24 * 60 * 60 * 1000,
  earnings: 24 * 60 * 60 * 1000
}

function getCached<T>(key: string, duration: number): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.timestamp > duration) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export type StockMarketData = {
  quote: StockQuote | null
  fundamentals: StockFundamentals | null
  technical: TechnicalData | null
  sentiment: NewsSentiment | null
  insider: InsiderSentiment | null
  analyst: AnalystRecommendation[] | null
  earnings: EarningsCalendar[] | null
  upgrades: { date: string; company: string; from: string; to: string; action: string }[] | null
  macro: MacroIndicators | null
  fetchedAt: string
  errors: string[]
}

export async function getStockMarketData(ticker: string): Promise<StockMarketData> {
  const errors: string[] = []
  const upperTicker = ticker.toUpperCase()

  const quoteKey = `quote:${upperTicker}`
  const fundKey = `fund:${upperTicker}`
  const techKey = `tech:${upperTicker}`
  const newsKey = `news:${upperTicker}`
  const insiderKey = `insider:${upperTicker}`
  const analystKey = `analyst:${upperTicker}`
  const earningsKey = `earnings:${upperTicker}`
  const upgradesKey = `upgrades:${upperTicker}`
  const macroKey = 'macro:global'

  let quote = getCached<StockQuote>(quoteKey, CACHE_DURATIONS.quote)
  let fundamentals = getCached<StockFundamentals>(fundKey, CACHE_DURATIONS.fundamentals)
  let technical = getCached<TechnicalData>(techKey, CACHE_DURATIONS.technical)
  let sentiment = getCached<NewsSentiment>(newsKey, CACHE_DURATIONS.news)
  let insider = getCached<InsiderSentiment>(insiderKey, CACHE_DURATIONS.insider)
  let analyst = getCached<AnalystRecommendation[]>(analystKey, CACHE_DURATIONS.analyst)
  let earnings = getCached<EarningsCalendar[]>(earningsKey, CACHE_DURATIONS.earnings)
  let upgrades = getCached<{ date: string; company: string; from: string; to: string; action: string }[]>(upgradesKey, CACHE_DURATIONS.analyst)
  let macro = getCached<MacroIndicators>(macroKey, CACHE_DURATIONS.macro)

  const fetchPromises: Promise<void>[] = []

  if (!quote) {
    fetchPromises.push(
      getStockQuote(upperTicker)
        .then((data) => { quote = data; setCache(quoteKey, data) })
        .catch((e) => { errors.push(`Quote: ${e.message}`) })
    )
  }

  if (!fundamentals) {
    fetchPromises.push(
      getStockFundamentals(upperTicker)
        .then((data) => { fundamentals = data; setCache(fundKey, data) })
        .catch((e) => { errors.push(`Fundamentals: ${e.message}`) })
    )
  }

  if (!technical) {
    fetchPromises.push(
      getTechnicalData(upperTicker)
        .then((data) => { technical = data; setCache(techKey, data) })
        .catch((e) => { errors.push(`Technical: ${e.message}`) })
    )
  }

  if (!sentiment) {
    fetchPromises.push(
      getNewsSentiment(upperTicker)
        .then((data) => { sentiment = data; setCache(newsKey, data) })
        .catch((e) => { errors.push(`Sentiment: ${e.message}`) })
    )
  }

  if (!insider) {
    fetchPromises.push(
      getInsiderSentiment(upperTicker)
        .then((data) => { insider = data; setCache(insiderKey, data) })
        .catch((e) => { errors.push(`Insider: ${e.message}`) })
    )
  }

  if (!analyst) {
    fetchPromises.push(
      getAnalystRecommendations(upperTicker)
        .then((data) => { analyst = data; setCache(analystKey, data) })
        .catch((e) => { errors.push(`Analyst: ${e.message}`) })
    )
  }

  if (!earnings) {
    fetchPromises.push(
      getEarningsCalendar(upperTicker)
        .then((data) => { earnings = data; setCache(earningsKey, data) })
        .catch((e) => { errors.push(`Earnings: ${e.message}`) })
    )
  }

  if (!upgrades) {
    fetchPromises.push(
      getUpgrades(upperTicker)
        .then((data) => { upgrades = data; setCache(upgradesKey, data) })
        .catch((e) => { errors.push(`Upgrades: ${e.message}`) })
    )
  }

  if (!macro) {
    fetchPromises.push(
      getMacroIndicators()
        .then((data) => { macro = data; setCache(macroKey, data) })
        .catch((e) => { errors.push(`Macro: ${e.message}`) })
    )
  }

  await Promise.all(fetchPromises)

  return {
    quote,
    fundamentals,
    technical,
    sentiment,
    insider,
    analyst,
    earnings,
    upgrades,
    macro,
    fetchedAt: new Date().toISOString(),
    errors
  }
}

export function formatDataForAgent(
  agentType: 'fundamental' | 'technical' | 'sentiment' | 'macro' | 'insider' | 'catalyst',
  data: StockMarketData
): string {
  switch (agentType) {
    case 'fundamental':
      return formatFundamentalData(data)
    case 'technical':
      return formatTechnicalDataForPrompt(data)
    case 'sentiment':
      return formatSentimentData(data)
    case 'macro':
      return formatMacroData(data)
    case 'insider':
      return formatInsiderData(data)
    case 'catalyst':
      return formatCatalystData(data)
    default:
      return ''
  }
}

function formatFundamentalData(data: StockMarketData): string {
  const lines: string[] = ['=== LIVE FUNDAMENTAL DATA ===']

  if (data.quote) {
    lines.push(`Current Price: $${data.quote.price.toFixed(2)}`)
    lines.push(`Market Cap: $${(data.quote.marketCap / 1e9).toFixed(2)}B`)
    lines.push(`52-Week High: $${data.quote.fiftyTwoWeekHigh.toFixed(2)}`)
    lines.push(`52-Week Low: $${data.quote.fiftyTwoWeekLow.toFixed(2)}`)
  }

  if (data.fundamentals) {
    const f = data.fundamentals
    lines.push('')
    lines.push('--- Valuation Metrics ---')
    if (f.peRatio) lines.push(`P/E Ratio: ${f.peRatio.toFixed(2)}`)
    if (f.forwardPE) lines.push(`Forward P/E: ${f.forwardPE.toFixed(2)}`)
    if (f.pegRatio) lines.push(`PEG Ratio: ${f.pegRatio.toFixed(2)}`)
    if (f.priceToBook) lines.push(`Price/Book: ${f.priceToBook.toFixed(2)}`)
    if (f.priceToSales) lines.push(`Price/Sales: ${f.priceToSales.toFixed(2)}`)
    if (f.evToEbitda) lines.push(`EV/EBITDA: ${f.evToEbitda.toFixed(2)}`)

    lines.push('')
    lines.push('--- Profitability ---')
    if (f.profitMargin) lines.push(`Profit Margin: ${(f.profitMargin * 100).toFixed(1)}%`)
    if (f.operatingMargin) lines.push(`Operating Margin: ${(f.operatingMargin * 100).toFixed(1)}%`)
    if (f.grossMargin) lines.push(`Gross Margin: ${(f.grossMargin * 100).toFixed(1)}%`)

    lines.push('')
    lines.push('--- Returns ---')
    if (f.returnOnEquity) lines.push(`ROE: ${(f.returnOnEquity * 100).toFixed(1)}%`)
    if (f.returnOnAssets) lines.push(`ROA: ${(f.returnOnAssets * 100).toFixed(1)}%`)

    lines.push('')
    lines.push('--- Growth ---')
    if (f.revenueGrowth) lines.push(`Revenue Growth: ${(f.revenueGrowth * 100).toFixed(1)}%`)
    if (f.earningsGrowth) lines.push(`Earnings Growth: ${(f.earningsGrowth * 100).toFixed(1)}%`)

    lines.push('')
    lines.push('--- Balance Sheet ---')
    if (f.debtToEquity) lines.push(`Debt/Equity: ${f.debtToEquity.toFixed(2)}`)
    if (f.currentRatio) lines.push(`Current Ratio: ${f.currentRatio.toFixed(2)}`)
    if (f.freeCashFlow) lines.push(`Free Cash Flow: $${(f.freeCashFlow / 1e9).toFixed(2)}B`)
    if (f.beta) lines.push(`Beta: ${f.beta.toFixed(2)}`)
  }

  return lines.join('\n')
}

function formatTechnicalDataForPrompt(data: StockMarketData): string {
  const lines: string[] = ['=== LIVE TECHNICAL DATA ===']

  if (data.technical) {
    const t = data.technical
    lines.push(`Current Price: $${t.currentPrice.toFixed(2)}`)
    lines.push('')
    lines.push('--- Moving Averages ---')
    if (t.sma50) {
      const aboveBelow50 = t.currentPrice > t.sma50 ? 'ABOVE' : 'BELOW'
      lines.push(`50-Day SMA: $${t.sma50.toFixed(2)} (Price ${aboveBelow50})`)
    }
    if (t.sma200) {
      const aboveBelow200 = t.currentPrice > t.sma200 ? 'ABOVE' : 'BELOW'
      lines.push(`200-Day SMA: $${t.sma200.toFixed(2)} (Price ${aboveBelow200})`)
    }
    if (t.sma50 && t.sma200) {
      const goldenDeath = t.sma50 > t.sma200 ? 'GOLDEN CROSS (bullish)' : 'DEATH CROSS (bearish)'
      lines.push(`MA Crossover: ${goldenDeath}`)
    }

    lines.push('')
    lines.push('--- Momentum Indicators ---')
    if (t.rsi14) {
      const rsiSignal = t.rsi14 > 70 ? 'OVERBOUGHT' : t.rsi14 < 30 ? 'OVERSOLD' : 'Neutral'
      lines.push(`RSI (14): ${t.rsi14.toFixed(1)} (${rsiSignal})`)
    }
    if (t.macdLine !== null && t.macdSignal !== null) {
      const macdBullBear = t.macdLine > t.macdSignal ? 'BULLISH' : 'BEARISH'
      lines.push(`MACD Line: ${t.macdLine.toFixed(4)}`)
      lines.push(`MACD Signal: ${t.macdSignal.toFixed(4)}`)
      lines.push(`MACD Histogram: ${t.macdHistogram?.toFixed(4)} (${macdBullBear})`)
    }

    lines.push('')
    lines.push('--- Support/Resistance ---')
    if (t.support) lines.push(`Near-term Support: $${t.support.toFixed(2)}`)
    if (t.resistance) lines.push(`Near-term Resistance: $${t.resistance.toFixed(2)}`)
  }

  if (data.quote) {
    lines.push('')
    lines.push('--- Volume ---')
    lines.push(`Volume: ${(data.quote.volume / 1e6).toFixed(2)}M`)
    lines.push(`Avg Volume: ${(data.quote.avgVolume / 1e6).toFixed(2)}M`)
    const volRatio = data.quote.volume / data.quote.avgVolume
    lines.push(`Volume Ratio: ${volRatio.toFixed(2)}x avg`)
  }

  return lines.join('\n')
}

function formatSentimentData(data: StockMarketData): string {
  const lines: string[] = ['=== LIVE SENTIMENT DATA ===']

  if (data.sentiment) {
    const s = data.sentiment
    lines.push(`Articles Analyzed: ${s.articlesAnalyzed}`)
    lines.push(`Bullish %: ${(s.bullishPercent * 100).toFixed(1)}%`)
    lines.push(`Bearish %: ${(s.bearishPercent * 100).toFixed(1)}%`)
    lines.push(`News Score: ${s.companyNewsScore.toFixed(3)}`)
    lines.push(`Sector Avg Bullish: ${(s.sectorAverageBullishPercent * 100).toFixed(1)}%`)

    if (s.recentArticles.length > 0) {
      lines.push('')
      lines.push('--- Recent Headlines ---')
      s.recentArticles.slice(0, 5).forEach((a, i) => {
        lines.push(`${i + 1}. [${a.sentiment.toUpperCase()}] ${a.headline}`)
      })
    }
  }

  if (data.analyst && data.analyst.length > 0) {
    const latest = data.analyst[0]
    lines.push('')
    lines.push('--- Analyst Ratings ---')
    lines.push(`Strong Buy: ${latest.strongBuy}`)
    lines.push(`Buy: ${latest.buy}`)
    lines.push(`Hold: ${latest.hold}`)
    lines.push(`Sell: ${latest.sell}`)
    lines.push(`Strong Sell: ${latest.strongSell}`)

    const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    const bullish = latest.strongBuy + latest.buy
    const bearish = latest.sell + latest.strongSell
    lines.push(`Bullish/Bearish Ratio: ${bullish}/${bearish} (${((bullish / total) * 100).toFixed(0)}% bullish)`)
  }

  if (data.upgrades && data.upgrades.length > 0) {
    lines.push('')
    lines.push('--- Recent Upgrades/Downgrades ---')
    data.upgrades.slice(0, 5).forEach((u) => {
      lines.push(`${u.date}: ${u.company} - ${u.action} (${u.from} -> ${u.to})`)
    })
  }

  return lines.join('\n')
}

function formatMacroData(data: StockMarketData): string {
  const lines: string[] = ['=== LIVE MACRO ECONOMIC DATA ===']

  if (data.macro) {
    lines.push(formatMacroSummary(data.macro))

    const signal = getMacroSignal(data.macro)
    lines.push('')
    lines.push('--- Macro Signal Analysis ---')
    lines.push(`Overall Signal: ${signal.signal.toUpperCase()} (Score: ${signal.score})`)
    lines.push('Key Factors:')
    signal.factors.forEach((f) => lines.push(`  - ${f}`))
  }

  return lines.join('\n')
}

function formatInsiderData(data: StockMarketData): string {
  const lines: string[] = ['=== LIVE INSIDER ACTIVITY DATA ===']

  if (data.insider) {
    const i = data.insider
    lines.push(`MSPR (Monthly Share Purchase Ratio): ${i.mspr.toFixed(4)}`)
    const msprSignal = i.mspr > 0.5 ? 'NET BUYING (bullish)' : i.mspr < -0.5 ? 'NET SELLING (bearish)' : 'Mixed'
    lines.push(`Signal: ${msprSignal}`)
    lines.push(`Net Share Change: ${i.change.toLocaleString()}`)

    if (i.transactions.length > 0) {
      lines.push('')
      lines.push('--- Recent Insider Transactions ---')

      const buys = i.transactions.filter((t) => t.transactionCode === 'P' || t.change > 0)
      const sells = i.transactions.filter((t) => t.transactionCode === 'S' || t.change < 0)

      lines.push(`Recent Buys: ${buys.length}`)
      lines.push(`Recent Sells: ${sells.length}`)

      i.transactions.slice(0, 8).forEach((t) => {
        const type = t.transactionCode === 'P' || t.change > 0 ? 'BUY' : 'SELL'
        const price = t.transactionPrice ? `@ $${t.transactionPrice.toFixed(2)}` : ''
        lines.push(`  ${t.transactionDate}: ${t.name} - ${type} ${Math.abs(t.change).toLocaleString()} shares ${price}`)
      })
    }
  }

  return lines.join('\n')
}

function formatCatalystData(data: StockMarketData): string {
  const lines: string[] = ['=== UPCOMING CATALYSTS ===']

  if (data.earnings && data.earnings.length > 0) {
    lines.push('')
    lines.push('--- Earnings Calendar ---')
    data.earnings.slice(0, 3).forEach((e) => {
      const timing = e.hour === 'bmo' ? 'Before Market Open' : e.hour === 'amc' ? 'After Market Close' : ''
      lines.push(`${e.date}: Earnings ${timing}`)
      if (e.epsEstimate) lines.push(`  EPS Estimate: $${e.epsEstimate.toFixed(2)}`)
      if (e.revenueEstimate) lines.push(`  Revenue Estimate: $${(e.revenueEstimate / 1e9).toFixed(2)}B`)
    })
  } else {
    lines.push('No upcoming earnings dates found')
  }

  if (data.upgrades && data.upgrades.length > 0) {
    lines.push('')
    lines.push('--- Recent Analyst Actions ---')
    data.upgrades.slice(0, 5).forEach((u) => {
      lines.push(`${u.date}: ${u.company} - ${u.action}`)
    })
  }

  if (data.sentiment?.recentArticles) {
    const catalystKeywords = ['earnings', 'fda', 'acquisition', 'merger', 'launch', 'announcement', 'conference', 'investor day']
    const catalystNews = data.sentiment.recentArticles.filter((a) =>
      catalystKeywords.some((kw) => a.headline.toLowerCase().includes(kw))
    )

    if (catalystNews.length > 0) {
      lines.push('')
      lines.push('--- Potential Catalyst News ---')
      catalystNews.slice(0, 3).forEach((n) => {
        lines.push(`- ${n.headline}`)
      })
    }
  }

  return lines.join('\n')
}

export function clearCache(): void {
  cache.clear()
}
