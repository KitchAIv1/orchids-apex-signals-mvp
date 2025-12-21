import { createClient } from '@supabase/supabase-js'
import type { Prediction, Stock, CheckpointEvaluation } from '@/types/database'
import { 
  getDaysElapsedDisplay, 
  getDaysRemaining, 
  getCheckpointStatus,
  type CheckpointType as SharedCheckpointType
} from '@/utils/checkpointCalculations'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey)

export type CheckpointType = SharedCheckpointType

export type CheckpointConfig = {
  type: CheckpointType
  tradingDays: number
  isPrimary: boolean
}

export const CHECKPOINT_CONFIGS: CheckpointConfig[] = [
  { type: '5d', tradingDays: 5, isPrimary: false },
  { type: '10d', tradingDays: 10, isPrimary: true },
  { type: '20d', tradingDays: 20, isPrimary: false }
]

export type CheckpointStatus = {
  type: CheckpointType
  status: 'pending' | 'ready' | 'evaluated'
  daysRemaining: number
  daysElapsed: number
  evaluation: CheckpointEvaluation | null
}

export type PredictionCheckpointSummary = {
  predictionId: string
  ticker: string
  checkpoints: CheckpointStatus[]
  primaryComplete: boolean
  allComplete: boolean
}

export type EvaluationResult = {
  predictionId: string
  ticker: string
  checkpoint: CheckpointType
  success: boolean
  evaluation?: CheckpointEvaluation
  error?: string
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY?.split('=').pop() || ''

function getCheckpointField(checkpoint: CheckpointType): string {
  return `evaluation_${checkpoint}`
}

function determineDirection(returnPct: number): 'UP' | 'DOWN' | 'FLAT' {
  if (returnPct > 0.5) return 'UP'
  if (returnPct < -0.5) return 'DOWN'
  return 'FLAT'
}

function calculateDirectionalAccuracy(
  recommendation: string,
  direction: 'UP' | 'DOWN' | 'FLAT'
): boolean {
  if (recommendation === 'BUY' && direction === 'UP') return true
  if (recommendation === 'SELL' && direction === 'DOWN') return true
  if (recommendation === 'HOLD' && direction === 'FLAT') return true
  return false
}

export class EvaluationService {
  static getCheckpointStatuses(prediction: Prediction): CheckpointStatus[] {
    const daysElapsed = getDaysElapsedDisplay(prediction.predicted_at)

    return CHECKPOINT_CONFIGS.map(config => {
      const existingEval = prediction[
        `evaluation_${config.type}` as keyof Prediction
      ] as CheckpointEvaluation | null

      // Use shared utility for consistent status determination
      const status = getCheckpointStatus(
        prediction.predicted_at,
        config.type,
        !!existingEval
      )
      
      const daysRemaining = getDaysRemaining(prediction.predicted_at, config.type)

      return {
        type: config.type,
        status,
        daysRemaining,
        daysElapsed,
        evaluation: existingEval
      }
    })
  }

  static getPredictionSummary(
    prediction: Prediction,
    stock: Stock
  ): PredictionCheckpointSummary {
    const checkpoints = this.getCheckpointStatuses(prediction)
    const primaryConfig = CHECKPOINT_CONFIGS.find(c => c.isPrimary)!
    const primaryCheckpoint = checkpoints.find(c => c.type === primaryConfig.type)!

    return {
      predictionId: prediction.id,
      ticker: stock.ticker,
      checkpoints,
      primaryComplete: primaryCheckpoint.status === 'evaluated',
      allComplete: checkpoints.every(c => c.status === 'evaluated')
    }
  }

  static async fetchCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      )
      if (!response.ok) return null
      const priceData = await response.json()
      return priceData.c || null
    } catch {
      return null
    }
  }

  static async evaluateCheckpoint(
    prediction: Prediction,
    stock: Stock,
    checkpoint: CheckpointType
  ): Promise<EvaluationResult> {
    const checkpointStatuses = this.getCheckpointStatuses(prediction)
    const targetStatus = checkpointStatuses.find(c => c.type === checkpoint)

    if (!targetStatus) {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: 'Invalid checkpoint type'
      }
    }

    if (targetStatus.status === 'evaluated') {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: 'Checkpoint already evaluated'
      }
    }

    if (targetStatus.status === 'pending') {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: `Wait ${targetStatus.daysRemaining} more day(s)`
      }
    }

    if (!prediction.price_at_prediction) {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: 'No price at prediction recorded'
      }
    }

    const currentPrice = await this.fetchCurrentPrice(stock.ticker)
    if (!currentPrice) {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: 'Failed to fetch current price'
      }
    }

    const returnPct =
      ((currentPrice - prediction.price_at_prediction) /
        prediction.price_at_prediction) *
      100
    const direction = determineDirection(returnPct)
    const directionalAccuracy = calculateDirectionalAccuracy(
      prediction.recommendation,
      direction
    )

    const evaluation: CheckpointEvaluation = {
      price: currentPrice,
      returnPct: Math.round(returnPct * 100) / 100,
      direction,
      directionalAccuracy,
      evaluatedAt: new Date().toISOString()
    }

    const config = CHECKPOINT_CONFIGS.find(c => c.type === checkpoint)!

    type PredictionUpdate = {
      evaluation_5d?: CheckpointEvaluation
      evaluation_10d?: CheckpointEvaluation
      evaluation_20d?: CheckpointEvaluation
      price_at_evaluation?: number
      return_pct?: number
      actual_direction?: 'UP' | 'DOWN' | 'FLAT'
      directional_accuracy?: boolean
      evaluated_at?: string
    }

    const updatePayload: PredictionUpdate = {}
    
    if (checkpoint === '5d') updatePayload.evaluation_5d = evaluation
    else if (checkpoint === '10d') updatePayload.evaluation_10d = evaluation
    else if (checkpoint === '20d') updatePayload.evaluation_20d = evaluation

    if (config.isPrimary) {
      updatePayload.price_at_evaluation = currentPrice
      updatePayload.return_pct = evaluation.returnPct
      updatePayload.actual_direction = direction
      updatePayload.directional_accuracy = directionalAccuracy
      updatePayload.evaluated_at = evaluation.evaluatedAt
    }

    const { error: updateError } = await supabaseUntyped
      .from('predictions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updatePayload as any)
      .eq('id', prediction.id)

    if (updateError) {
      return {
        predictionId: prediction.id,
        ticker: stock.ticker,
        checkpoint,
        success: false,
        error: `Database update failed: ${updateError.message}`
      }
    }

    return {
      predictionId: prediction.id,
      ticker: stock.ticker,
      checkpoint,
      success: true,
      evaluation
    }
  }

  static async evaluateAllReadyCheckpoints(
    prediction: Prediction,
    stock: Stock
  ): Promise<EvaluationResult[]> {
    const checkpointStatuses = this.getCheckpointStatuses(prediction)
    const readyCheckpoints = checkpointStatuses.filter(
      c => c.status === 'ready'
    )
    const results: EvaluationResult[] = []

    for (const checkpoint of readyCheckpoints) {
      const result = await this.evaluateCheckpoint(
        prediction,
        stock,
        checkpoint.type
      )
      results.push(result)
    }

    return results
  }

  static async getUnevaluatedPredictions(): Promise<
    (Prediction & { stock: Stock })[]
  > {
    const { data: predictions, error: predError } = await supabaseUntyped
      .from('predictions')
      .select('*')
      .order('predicted_at', { ascending: true })

    if (predError) throw predError
    if (!predictions) return []

    const { data: stocks } = await supabaseUntyped.from('stocks').select('*')
    const stockMap = new Map((stocks as Stock[] || []).map(s => [s.id, s]))

    return (predictions as Prediction[])
      .map(p => ({ ...p, stock: stockMap.get(p.stock_id)! }))
      .filter(p => p.stock)
  }
}