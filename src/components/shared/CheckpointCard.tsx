import { cn } from '@/lib/utils'
import { Clock, Target } from 'lucide-react'
import { CircularProgress } from './CircularProgress'
import type { Prediction, CheckpointEvaluation } from '@/types/database'

type CheckpointType = '5d' | '10d' | '20d'

export type CheckpointMetrics = {
  type: CheckpointType
  label: string
  evaluated: number
  correct: number
  accuracy: number
  avgReturn: number
  isPrimary: boolean
}

export function calculateCheckpointMetrics(
  predictions: Prediction[],
  checkpointType: CheckpointType,
  label: string,
  isPrimary: boolean
): CheckpointMetrics {
  const fieldName = `evaluation_${checkpointType}` as keyof Prediction
  const evaluatedPredictions = predictions.filter(
    p => p[fieldName] !== null && p[fieldName] !== undefined
  )
  const evaluated = evaluatedPredictions.length
  const correct = evaluatedPredictions.filter(p => {
    const evaluation = p[fieldName] as CheckpointEvaluation
    return evaluation?.directionalAccuracy
  }).length
  const accuracy = evaluated > 0 ? (correct / evaluated) * 100 : 0
  const totalReturn = evaluatedPredictions.reduce((sum, p) => {
    const evaluation = p[fieldName] as CheckpointEvaluation
    return sum + (evaluation?.returnPct ?? 0)
  }, 0)
  const avgReturn = evaluated > 0 ? totalReturn / evaluated : 0

  return { type: checkpointType, label, evaluated, correct, accuracy, avgReturn, isPrimary }
}

export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 55) return 'text-emerald-400'
  if (accuracy >= 45) return 'text-amber-400'
  return 'text-rose-400'
}

export function CheckpointCard({ metrics }: { metrics: CheckpointMetrics }) {
  const accuracyColor = getAccuracyColor(metrics.accuracy)

  return (
    <div className={cn(
      'rounded-xl border bg-zinc-900/50 p-4',
      metrics.isPrimary ? 'border-violet-500/30 bg-violet-500/5' : 'border-zinc-800'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">{metrics.label}</span>
          {metrics.isPrimary && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-400 rounded">
              PRIMARY
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">{metrics.evaluated} evaluated</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          <CircularProgress 
            value={metrics.accuracy} 
            size={44} 
            strokeWidth={3}
            color={accuracyColor}
          />
          <Target className={cn('absolute h-4 w-4', accuracyColor)} />
        </div>
        <div className="flex-1">
          <p className={cn('text-xl font-bold tabular-nums', accuracyColor)}>
            {metrics.accuracy.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-500">accuracy</p>
        </div>
        <div className="text-right">
          <p className={cn(
            'text-lg font-semibold tabular-nums',
            metrics.avgReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {metrics.avgReturn >= 0 ? '+' : ''}{metrics.avgReturn.toFixed(2)}%
          </p>
          <p className="text-xs text-zinc-500">avg return</p>
        </div>
      </div>
    </div>
  )
}

