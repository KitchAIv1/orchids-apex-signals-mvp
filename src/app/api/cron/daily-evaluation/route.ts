import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EvaluationService, CHECKPOINT_CONFIGS } from '@/services/EvaluationService'
import type { Prediction, Stock } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Daily Evaluation Cron
 * 
 * Runs daily at 6 PM ET (after market close) to:
 * 1. Find all predictions with ready checkpoints
 * 2. Evaluate them against current prices
 * 3. Update agent_performance metrics
 * 
 * Schedule: 0 23 * * 1-5 (23:00 UTC = 6 PM ET on weekdays)
 */

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all predictions
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .order('predicted_at', { ascending: true })

    if (predError) {
      return NextResponse.json({ error: predError.message }, { status: 500 })
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        message: 'No predictions found to evaluate',
        evaluated: [],
        skipped: [],
        stats: { total: 0, evaluated: 0, skipped: 0 }
      })
    }

    // Fetch all stocks
    const { data: stocks } = await supabase.from('stocks').select('*')
    const stockMap = new Map((stocks as Stock[] || []).map(s => [s.id, s]))

    const results = {
      evaluated: [] as { ticker: string; checkpoint: string; returnPct: number; accurate: boolean }[],
      skipped: [] as { ticker: string; checkpoint: string; reason: string }[],
      errors: [] as { ticker: string; checkpoint: string; error: string }[]
    }

    // Process each prediction
    for (const prediction of predictions as Prediction[]) {
      const stock = stockMap.get(prediction.stock_id)
      if (!stock) continue

      // Evaluate all ready checkpoints
      const checkpointResults = await EvaluationService.evaluateAllReadyCheckpoints(
        prediction,
        stock
      )

      for (const result of checkpointResults) {
        if (result.success && result.evaluation) {
          results.evaluated.push({
            ticker: result.ticker,
            checkpoint: result.checkpoint,
            returnPct: result.evaluation.returnPct,
            accurate: result.evaluation.directionalAccuracy
          })
        } else if (result.error?.includes('Wait') || result.error?.includes('already evaluated')) {
          results.skipped.push({
            ticker: result.ticker,
            checkpoint: result.checkpoint,
            reason: result.error || 'Unknown'
          })
        } else if (result.error) {
          results.errors.push({
            ticker: result.ticker,
            checkpoint: result.checkpoint,
            error: result.error
          })
        }
      }
    }

    // Calculate and store agent performance after evaluations
    if (results.evaluated.length > 0) {
      await updateAgentPerformance()
    }

    return NextResponse.json({
      message: `Daily evaluation complete. Evaluated ${results.evaluated.length} checkpoints.`,
      stats: {
        total: predictions.length,
        evaluated: results.evaluated.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
        accuracy: results.evaluated.length > 0
          ? (results.evaluated.filter(e => e.accurate).length / results.evaluated.length * 100).toFixed(1) + '%'
          : 'N/A'
      },
      evaluated: results.evaluated,
      skipped: results.skipped.slice(0, 10), // Limit output
      errors: results.errors
    })
  } catch (err) {
    console.error('Daily evaluation cron error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Update agent performance metrics based on evaluated predictions
 */
async function updateAgentPerformance(): Promise<void> {
  try {
    // Get all evaluated predictions (those with at least 10d evaluation)
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*, agent_scores(*)')
      .not('evaluation_10d', 'is', null)

    if (error || !predictions || predictions.length === 0) {
      console.log('No evaluated predictions for agent performance calculation')
      return
    }

    const agentStats = new Map<string, { correct: number; total: number; scores: number[] }>()

    for (const prediction of predictions) {
      const agentScores = (prediction as { agent_scores?: { agent_name: string; score: number }[] }).agent_scores || []
      const evaluation = prediction.evaluation_10d as { directionalAccuracy: boolean } | null

      if (!evaluation) continue

      for (const agentScore of agentScores) {
        const stats = agentStats.get(agentScore.agent_name) || { correct: 0, total: 0, scores: [] }
        stats.total++
        stats.scores.push(agentScore.score)

        // Check if agent's score direction aligned with actual outcome
        const agentBullish = agentScore.score > 0
        const outcomePositive = evaluation.directionalAccuracy

        if (agentBullish === outcomePositive) {
          stats.correct++
        }

        agentStats.set(agentScore.agent_name, stats)
      }
    }

    // Store performance metrics
    const now = new Date()
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const periodEnd = now.toISOString()

    for (const [agentName, stats] of agentStats) {
      const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length

      await supabase
        .from('agent_performance')
        .upsert({
          agent_name: agentName,
          period_start: periodStart,
          period_end: periodEnd,
          total_predictions: stats.total,
          correct_predictions: stats.correct,
          accuracy_rate: stats.total > 0 ? (stats.correct / stats.total) * 100 : null,
          avg_score: avgScore,
          calculated_at: now.toISOString()
        }, {
          onConflict: 'agent_name,period_start'
        })
    }

    console.log(`Updated performance metrics for ${agentStats.size} agents`)
  } catch (err) {
    console.error('Failed to update agent performance:', err)
  }
}

export async function GET() {
  // Get evaluation status summary
  const { data: predictions } = await supabase
    .from('predictions')
    .select('predicted_at, evaluation_5d, evaluation_10d, evaluation_20d')

  const stats = {
    total: predictions?.length || 0,
    evaluated5d: predictions?.filter(p => p.evaluation_5d).length || 0,
    evaluated10d: predictions?.filter(p => p.evaluation_10d).length || 0,
    evaluated20d: predictions?.filter(p => p.evaluation_20d).length || 0,
    ready5d: 0,
    ready10d: 0,
    ready20d: 0
  }

  const now = new Date()
  predictions?.forEach(p => {
    const daysElapsed = Math.floor((now.getTime() - new Date(p.predicted_at).getTime()) / (1000 * 60 * 60 * 24))
    if (!p.evaluation_5d && daysElapsed >= 5) stats.ready5d++
    if (!p.evaluation_10d && daysElapsed >= 10) stats.ready10d++
    if (!p.evaluation_20d && daysElapsed >= 20) stats.ready20d++
  })

  // Get agent performance
  const { data: agentPerformance } = await supabase
    .from('agent_performance')
    .select('*')
    .order('calculated_at', { ascending: false })
    .limit(6)

  return NextResponse.json({
    message: 'Daily evaluation cron endpoint. Use POST to trigger.',
    status: 'ready',
    schedule: {
      frequency: 'Daily on trading days (Mon-Fri)',
      time: '6:00 PM ET (23:00 UTC)',
      purpose: 'Evaluate predictions against actual market prices'
    },
    checkpoints: CHECKPOINT_CONFIGS.map(c => ({
      type: c.type,
      days: c.tradingDays,
      isPrimary: c.isPrimary
    })),
    evaluationStats: stats,
    agentPerformance: agentPerformance || []
  })
}

