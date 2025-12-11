import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/services/PaperTradingService'

export async function GET() {
  try {
    const [portfolio, positions, history] = await Promise.all([
      PaperTradingService.getPortfolioWithValue(),
      PaperTradingService.getOpenPositions(),
      PaperTradingService.getTradeHistory(),
    ])

    return NextResponse.json({ portfolio, positions, history })
  } catch (error) {
    console.error('Paper trading GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ticker, shares, tradeId, predictionId, aiConfidence, aiDirection, notes } = body

    if (action === 'buy') {
      if (!ticker || !shares || shares <= 0) {
        return NextResponse.json({ error: 'Invalid ticker or shares' }, { status: 400 })
      }
      const trade = await PaperTradingService.executeBuy({
        ticker: ticker.toUpperCase(),
        shares,
        predictionId,
        aiConfidence,
        aiDirection,
        notes,
      })
      return NextResponse.json({ success: true, trade })
    }

    if (action === 'sell') {
      if (!tradeId) {
        return NextResponse.json({ error: 'Trade ID required' }, { status: 400 })
      }
      const trade = await PaperTradingService.executeSell(tradeId)
      return NextResponse.json({ success: true, trade })
    }

    if (action === 'reset') {
      await PaperTradingService.resetPortfolio()
      return NextResponse.json({ success: true, message: 'Portfolio reset to $100,000' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Paper trading POST error:', error)
    const message = error instanceof Error ? error.message : 'Trade execution failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
