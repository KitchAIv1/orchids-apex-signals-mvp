import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { analyzeStock } from '@/services/AIAgentService'
import type { Stock, Prediction } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: activeStocks, error: stockError } = await supabase
      .from('stocks')
      .select('ticker')
      .eq('is_active', true) as { data: Pick<Stock, 'ticker'>[] | null; error: unknown }

    if (stockError) {
      console.error('Error fetching stocks:', stockError)
      return NextResponse.json({ error: (stockError as Error).message }, { status: 500 })
    }

    if (!activeStocks || activeStocks.length === 0) {
      return NextResponse.json({ 
        message: 'No active stocks to analyze', 
        analyzed: [],
        failed: []
      })
    }

    const results = await processStocks(activeStocks.map(s => s.ticker))
    
    return NextResponse.json({
      message: `Weekly analysis completed for ${results.success.length} stocks`,
      totalStocks: activeStocks.length,
      analyzed: results.success,
      failed: results.failed
    })
  } catch (err) {
    console.error('Weekly analysis cron error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function processStocks(tickers: string[]): Promise<{ success: string[]; failed: { ticker: string; error: string }[] }> {
  const success: string[] = []
  const failed: { ticker: string; error: string }[] = []

  for (const ticker of tickers) {
    try {
      console.log(`Processing weekly analysis for ${ticker}`)
      const result = await analyzeStock(ticker)
      
      if (result.success) {
        success.push(ticker)
        await trackRecommendationChange(ticker, result.predictionId)
      } else {
        failed.push({ ticker, error: result.error || 'Analysis failed' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      failed.push({ ticker, error: message })
    }
  }

  return { success, failed }
}

async function trackRecommendationChange(ticker: string, newPredictionId?: string) {
  if (!newPredictionId) return

  const { data: stock } = await supabase
    .from('stocks')
    .select('id')
    .eq('ticker', ticker.toUpperCase())
    .single() as { data: Pick<Stock, 'id'> | null }

  if (!stock) return

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, recommendation, final_score, predicted_at')
    .eq('stock_id', stock.id)
    .order('predicted_at', { ascending: false })
    .limit(2) as { data: Pick<Prediction, 'id' | 'recommendation' | 'final_score' | 'predicted_at'>[] | null }

  if (!predictions || predictions.length < 2) return

  const [current, previous] = predictions

  if (current.recommendation !== previous.recommendation) {
    // @ts-expect-error - table exists but types not yet regenerated
    await supabase.from('recommendation_history').insert({
      stock_id: stock.id,
      previous_recommendation: previous.recommendation,
      new_recommendation: current.recommendation,
      previous_score: previous.final_score,
      new_score: current.final_score,
      change_reason: `Weekly reanalysis: score changed from ${previous.final_score} to ${current.final_score}`
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Weekly analysis cron endpoint. Use POST to trigger.',
    status: 'ready',
    schedule: {
      frequency: 'Once weekly on Sunday',
      time: '5:00 AM ET (10:00 UTC)',
      purpose: 'Refresh all stock analyses before trading week begins'
    },
    analysisScope: {
      description: 'Analyzes all active stocks in the portfolio',
      agents: ['fundamental', 'technical', 'sentiment', 'macro', 'insider', 'catalyst'],
      output: 'Updated predictions with BUY/HOLD/SELL recommendations'
    }
  })
}