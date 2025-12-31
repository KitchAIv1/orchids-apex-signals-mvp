import { getStockQuote } from './YahooFinanceService'

export type OHLCData = {
  time: string | number  // string for daily, number (unix timestamp) for intraday
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'

export async function fetchHistoricalData(
  ticker: string,
  timeframe: ChartTimeframe = '3M'
): Promise<OHLCData[]> {
  try {
    const response = await fetch(`/api/chart-data?ticker=${ticker}&timeframe=${timeframe}`)
    const result = await response.json()

    if (result.error) {
      console.warn(`Chart data error for ${ticker}:`, result.error)
      return []
    }

    return result.data || []
  } catch (error) {
    console.error(`Failed to fetch chart data for ${ticker}:`, error)
    return []
  }
}

export async function fetchCurrentQuote(ticker: string) {
  try {
    return await getStockQuote(ticker)
  } catch {
    return null
  }
}

export function calculatePriceChange(currentPrice: number, previousClose: number) {
  const change = currentPrice - previousClose
  const changePercent = (change / previousClose) * 100
  return { change, changePercent }
}

