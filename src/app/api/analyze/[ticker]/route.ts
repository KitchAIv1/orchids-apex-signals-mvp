import { NextResponse } from 'next/server'
import { analyzeStock } from '@/services/AIAgentService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
    }

    console.log(`Starting analysis for ${ticker}`)
    const result = await analyzeStock(ticker)
    console.log(`Analysis result:`, result)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      predictionId: result.predictionId,
      message: `Analysis completed for ${ticker.toUpperCase()}`
    })
  } catch (err) {
    console.error('Analysis error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}