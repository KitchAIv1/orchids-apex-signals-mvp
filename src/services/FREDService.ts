const FRED_BASE = 'https://api.stlouisfed.org/fred'

export type FREDSeriesData = {
  seriesId: string
  title: string
  observations: { date: string; value: number | null }[]
  latestValue: number | null
  latestDate: string
  changeFromLastMonth: number | null
  changeFromLastYear: number | null
}

export type MacroIndicators = {
  fedFundsRate: FREDSeriesData | null
  tenYearYield: FREDSeriesData | null
  twoYearYield: FREDSeriesData | null
  yieldCurveSpread: number | null
  unemployment: FREDSeriesData | null
  cpi: FREDSeriesData | null
  gdpGrowth: FREDSeriesData | null
  consumerSentiment: FREDSeriesData | null
  retailSales: FREDSeriesData | null
  industrialProduction: FREDSeriesData | null
  sp500: FREDSeriesData | null
  vix: FREDSeriesData | null
}

const SERIES_METADATA: Record<string, { title: string; description: string }> = {
  FEDFUNDS: { title: 'Fed Funds Rate', description: 'Effective Federal Funds Rate' },
  DGS10: { title: '10-Year Treasury', description: '10-Year Treasury Constant Maturity Rate' },
  DGS2: { title: '2-Year Treasury', description: '2-Year Treasury Constant Maturity Rate' },
  UNRATE: { title: 'Unemployment Rate', description: 'Civilian Unemployment Rate' },
  CPIAUCSL: { title: 'CPI', description: 'Consumer Price Index for All Urban Consumers' },
  A191RL1Q225SBEA: { title: 'GDP Growth', description: 'Real GDP Growth Rate (Quarterly)' },
  UMCSENT: { title: 'Consumer Sentiment', description: 'University of Michigan Consumer Sentiment' },
  RSAFS: { title: 'Retail Sales', description: 'Advance Retail Sales' },
  INDPRO: { title: 'Industrial Production', description: 'Industrial Production Index' },
  SP500: { title: 'S&P 500', description: 'S&P 500 Index' },
  VIXCLS: { title: 'VIX', description: 'CBOE Volatility Index' }
}

function getApiKey(): string {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY not configured')
  return key.replace(/^your_key=/, '')
}

async function fredRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FRED_BASE}${endpoint}`)
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('file_type', 'json')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function getSeriesObservations(
  seriesId: string,
  observationStart?: string
): Promise<FREDSeriesData> {
  const startDate = observationStart || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const data = await fredRequest<{
    observations?: { date?: string; value?: string }[]
  }>('/series/observations', {
    series_id: seriesId,
    observation_start: startDate,
    sort_order: 'desc'
  })

  const observations = (data.observations || [])
    .map((obs) => ({
      date: obs.date || '',
      value: obs.value === '.' ? null : parseFloat(obs.value || '0')
    }))
    .filter((obs) => obs.value !== null)
    .reverse()

  const latestObs = observations.slice(-1)[0]
  const prevMonthObs = observations.slice(-2)[0]
  const yearAgoObs = observations.find((obs) => {
    const obsDate = new Date(obs.date)
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    return Math.abs(obsDate.getTime() - yearAgo.getTime()) < 45 * 24 * 60 * 60 * 1000
  })

  const metadata = SERIES_METADATA[seriesId] || { title: seriesId, description: '' }

  return {
    seriesId,
    title: metadata.title,
    observations: observations.slice(-24),
    latestValue: latestObs?.value ?? null,
    latestDate: latestObs?.date ?? '',
    changeFromLastMonth: latestObs && prevMonthObs && latestObs.value !== null && prevMonthObs.value !== null
      ? latestObs.value - prevMonthObs.value
      : null,
    changeFromLastYear: latestObs && yearAgoObs && latestObs.value !== null && yearAgoObs.value !== null
      ? latestObs.value - yearAgoObs.value
      : null
  }
}

export async function getMacroIndicators(): Promise<MacroIndicators> {
  const seriesIds = [
    'FEDFUNDS',
    'DGS10',
    'DGS2',
    'UNRATE',
    'CPIAUCSL',
    'A191RL1Q225SBEA',
    'UMCSENT',
    'RSAFS',
    'INDPRO',
    'SP500',
    'VIXCLS'
  ]

  const results = await Promise.allSettled(seriesIds.map((id) => getSeriesObservations(id)))

  const getValue = (index: number): FREDSeriesData | null => {
    const result = results[index]
    return result.status === 'fulfilled' ? result.value : null
  }

  const tenYear = getValue(1)
  const twoYear = getValue(2)
  const yieldSpread = tenYear?.latestValue !== null && twoYear?.latestValue !== null
    ? (tenYear?.latestValue ?? 0) - (twoYear?.latestValue ?? 0)
    : null

  return {
    fedFundsRate: getValue(0),
    tenYearYield: tenYear,
    twoYearYield: twoYear,
    yieldCurveSpread: yieldSpread,
    unemployment: getValue(3),
    cpi: getValue(4),
    gdpGrowth: getValue(5),
    consumerSentiment: getValue(6),
    retailSales: getValue(7),
    industrialProduction: getValue(8),
    sp500: getValue(9),
    vix: getValue(10)
  }
}

export function formatMacroSummary(macro: MacroIndicators): string {
  const lines: string[] = []

  if (macro.fedFundsRate && macro.fedFundsRate.latestValue !== null) {
    lines.push(`Fed Funds Rate: ${macro.fedFundsRate.latestValue.toFixed(2)}%`)
  }

  if (macro.tenYearYield && macro.tenYearYield.latestValue !== null) {
    lines.push(`10Y Treasury: ${macro.tenYearYield.latestValue.toFixed(2)}%`)
  }

  if (macro.yieldCurveSpread !== null) {
    const status = macro.yieldCurveSpread < 0 ? ' (INVERTED - recession signal)' : ''
    lines.push(`Yield Curve (10Y-2Y): ${macro.yieldCurveSpread.toFixed(2)}%${status}`)
  }

  if (macro.unemployment && macro.unemployment.latestValue !== null) {
    lines.push(`Unemployment: ${macro.unemployment.latestValue.toFixed(1)}%`)
  }

  if (macro.cpi && macro.cpi.changeFromLastYear !== null) {
    lines.push(`CPI YoY Change: ${macro.cpi.changeFromLastYear.toFixed(1)} (inflation indicator)`)
  }

  if (macro.gdpGrowth && macro.gdpGrowth.latestValue !== null) {
    lines.push(`GDP Growth (Q): ${macro.gdpGrowth.latestValue.toFixed(1)}%`)
  }

  if (macro.consumerSentiment && macro.consumerSentiment.latestValue !== null) {
    lines.push(`Consumer Sentiment: ${macro.consumerSentiment.latestValue.toFixed(1)}`)
  }

  if (macro.vix && macro.vix.latestValue !== null) {
    const vixLevel = macro.vix.latestValue > 30 ? 'HIGH FEAR' : macro.vix.latestValue > 20 ? 'Elevated' : 'Low'
    lines.push(`VIX: ${macro.vix.latestValue.toFixed(1)} (${vixLevel})`)
  }

  return lines.join('\n')
}

export function getMacroSignal(macro: MacroIndicators): {
  score: number
  signal: 'bullish' | 'bearish' | 'neutral'
  factors: string[]
} {
  let score = 0
  const factors: string[] = []

  if (macro.yieldCurveSpread !== null) {
    if (macro.yieldCurveSpread < 0) {
      score -= 20
      factors.push('Inverted yield curve (recession risk)')
    } else if (macro.yieldCurveSpread < 0.5) {
      score -= 10
      factors.push('Flat yield curve (slowdown signal)')
    } else {
      score += 5
      factors.push('Normal yield curve')
    }
  }

  if (macro.fedFundsRate && macro.fedFundsRate.changeFromLastMonth !== null) {
    if (macro.fedFundsRate.changeFromLastMonth > 0) {
      score -= 10
      factors.push('Fed raising rates')
    } else if (macro.fedFundsRate.changeFromLastMonth < 0) {
      score += 10
      factors.push('Fed cutting rates (accommodative)')
    }
  }

  if (macro.unemployment && macro.unemployment.latestValue !== null) {
    if (macro.unemployment.latestValue < 4) {
      score += 10
      factors.push('Strong labor market')
    } else if (macro.unemployment.latestValue > 5) {
      score -= 10
      factors.push('Elevated unemployment')
    }
  }

  if (macro.gdpGrowth && macro.gdpGrowth.latestValue !== null) {
    if (macro.gdpGrowth.latestValue > 2) {
      score += 15
      factors.push('Strong GDP growth')
    } else if (macro.gdpGrowth.latestValue < 0) {
      score -= 20
      factors.push('Negative GDP growth (contraction)')
    }
  }

  if (macro.vix && macro.vix.latestValue !== null) {
    if (macro.vix.latestValue > 30) {
      score -= 15
      factors.push('High VIX (market fear)')
    } else if (macro.vix.latestValue < 15) {
      score += 5
      factors.push('Low VIX (complacency)')
    }
  }

  if (macro.consumerSentiment && macro.consumerSentiment.latestValue !== null) {
    if (macro.consumerSentiment.latestValue > 80) {
      score += 10
      factors.push('Strong consumer sentiment')
    } else if (macro.consumerSentiment.latestValue < 60) {
      score -= 10
      factors.push('Weak consumer sentiment')
    }
  }

  const clampedScore = Math.max(-100, Math.min(100, score))
  const signal: 'bullish' | 'bearish' | 'neutral' =
    clampedScore > 15 ? 'bullish' : clampedScore < -15 ? 'bearish' : 'neutral'

  return { score: clampedScore, signal, factors }
}