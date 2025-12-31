import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EvaluationService, CHECKPOINT_CONFIGS } from '@/services/EvaluationService'
import { withStrictRateLimit } from '@/lib/security'
import type { Prediction, Stock } from '@/types/database'
import type { CheckpointType, EvaluationResult } from '@/services/EvaluationService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type CheckpointSummaryResponse = {
  predictionId: string
  ticker: string
  checkpoints: {
    type: CheckpointType
    status: 'pending' | 'ready' | 'evaluated'
    daysRemaining: number
  }[]
}

export async function GET() {
  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('*')
    .order('predicted_at', { ascending: true })

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 })
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ 
      message: 'No predictions found',
      summaries: [] 
    })
  }

  const { data: stocks } = await supabase.from('stocks').select('*')
  const stockMap = new Map((stocks as Stock[] || []).map(s => [s.id, s]))

  const summaries: CheckpointSummaryResponse[] = []
  
  for (const prediction of predictions as Prediction[]) {
    const stock = stockMap.get(prediction.stock_id)
    if (!stock) continue
    
    const checkpointStatuses = EvaluationService.getCheckpointStatuses(prediction)
    
    summaries.push({
      predictionId: prediction.id,
      ticker: stock.ticker,
      checkpoints: checkpointStatuses.map(c => ({
        type: c.type,
        status: c.status,
        daysRemaining: c.daysRemaining
      }))
    })
  }

  const readyCount = summaries.reduce(
    (acc, s) => acc + s.checkpoints.filter(c => c.status === 'ready').length,
    0
  )
  const pendingCount = summaries.reduce(
    (acc, s) => acc + s.checkpoints.filter(c => c.status === 'pending').length,
    0
  )
  const evaluatedCount = summaries.reduce(
    (acc, s) => acc + s.checkpoints.filter(c => c.status === 'evaluated').length,
    0
  )

  return NextResponse.json({
    summaries,
    stats: {
      total: summaries.length,
      readyCheckpoints: readyCount,
      pendingCheckpoints: pendingCount,
      evaluatedCheckpoints: evaluatedCount
    }
  })
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests/min per IP (modifies database)
  const rateLimitError = withStrictRateLimit(request, 'evaluate')
  if (rateLimitError) return rateLimitError

  const body = await request.json()
  const { 
    predictionIds, 
    checkpoint, 
    autoEvaluate = false 
  } = body

  let predictions: Prediction[]
  
  if (predictionIds && Array.isArray(predictionIds)) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .in('id', predictionIds)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    predictions = (data || []) as Prediction[]
  } else if (autoEvaluate) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('predicted_at', { ascending: true })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    predictions = (data || []) as Prediction[]
  } else {
    return NextResponse.json(
      { error: 'Provide predictionIds or set autoEvaluate: true' },
      { status: 400 }
    )
  }

  if (predictions.length === 0) {
    return NextResponse.json({ 
      message: 'No predictions to evaluate',
      results: [] 
    })
  }

  const { data: stocks } = await supabase.from('stocks').select('*')
  const stockMap = new Map((stocks as Stock[] || []).map(s => [s.id, s]))

  const results: EvaluationResult[] = []
  
  for (const prediction of predictions) {
    const stock = stockMap.get(prediction.stock_id)
    if (!stock) {
      results.push({
        predictionId: prediction.id,
        ticker: 'UNKNOWN',
        checkpoint: checkpoint || '10d',
        success: false,
        error: 'Stock not found'
      })
      continue
    }

    if (checkpoint && CHECKPOINT_CONFIGS.some(c => c.type === checkpoint)) {
      const result = await EvaluationService.evaluateCheckpoint(
        prediction,
        stock,
        checkpoint as CheckpointType
      )
      results.push(result)
    } else if (autoEvaluate) {
      const checkpointResults = await EvaluationService.evaluateAllReadyCheckpoints(
        prediction,
        stock
      )
      results.push(...checkpointResults)
    } else {
      const primaryConfig = CHECKPOINT_CONFIGS.find(c => c.isPrimary)!
      const result = await EvaluationService.evaluateCheckpoint(
        prediction,
        stock,
        primaryConfig.type
      )
      results.push(result)
    }
  }

  const evaluated = results.filter(r => r.success)
  const skipped = results.filter(r => !r.success)

  return NextResponse.json({
    message: `Evaluated ${evaluated.length} checkpoints, skipped ${skipped.length}`,
    results,
    summary: {
      total: predictions.length,
      evaluated: evaluated.length,
      skipped: skipped.length,
      byCheckpoint: CHECKPOINT_CONFIGS.map(c => ({
        type: c.type,
        evaluated: evaluated.filter(r => r.checkpoint === c.type).length,
        skipped: skipped.filter(r => r.checkpoint === c.type).length
      }))
    }
  })
}
