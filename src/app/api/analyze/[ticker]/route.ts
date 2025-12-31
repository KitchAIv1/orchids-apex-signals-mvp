import { NextRequest, NextResponse } from 'next/server'
import { analyzeStock } from '@/services/AIAgentService'
import { withStrictRateLimit, sanitizeTicker } from '@/lib/security'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  // Rate limit: 5 requests/min per IP (expensive AI operation)
  const rateLimitError = withStrictRateLimit(request, 'analyze')
  if (rateLimitError) return rateLimitError

  try {
    const { ticker: rawTicker } = await params

    // Sanitize ticker input
    const ticker = sanitizeTicker(rawTicker)
    if (!ticker) {
      return NextResponse.json({ error: 'Valid ticker is required' }, { status: 400 })
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