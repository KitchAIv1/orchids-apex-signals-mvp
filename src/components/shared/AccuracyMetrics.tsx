'use client'

import { cn } from '@/lib/utils'
import type { Prediction, CheckpointEvaluation } from '@/types/database'
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent, Clock } from 'lucide-react'

type Props = {
  predictions: Prediction[]
}

type CheckpointType = '5d' | '10d' | '20d'

type CheckpointMetrics = {
  type: CheckpointType
  label: string
  evaluated: number
  correct: number
  accuracy: number
  avgReturn: number
  isPrimary: boolean
}

function CircularProgress({ value, size = 48, strokeWidth = 4, color }: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn('transition-all duration-700 ease-out', color)}
      />
    </svg>
  )
}

function calculateCheckpointMetrics(
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

function CheckpointCard({ metrics }: { metrics: CheckpointMetrics }) {
  const accuracyColor = metrics.accuracy >= 55 
    ? 'text-emerald-400' 
    : metrics.accuracy >= 45 
    ? 'text-amber-400' 
    : 'text-rose-400'

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

export function AccuracyMetrics({ predictions }: Props) {
  const checkpointMetrics = [
    calculateCheckpointMetrics(predictions, '5d', 'Week 1 (5d)', false),
    calculateCheckpointMetrics(predictions, '10d', 'Week 2 (10d)', true),
    calculateCheckpointMetrics(predictions, '20d', 'Week 4 (20d)', false)
  ]

  const primaryMetrics = checkpointMetrics.find(m => m.isPrimary)!
  
  const buyPredictions = predictions.filter(p => p.recommendation === 'BUY')
  const holdPredictions = predictions.filter(p => p.recommendation === 'HOLD')
  const sellPredictions = predictions.filter(p => p.recommendation === 'SELL')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Predictions</p>
              <p className="text-2xl font-bold text-zinc-100 tabular-nums">{predictions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">10d Evaluated</p>
              <p className="text-2xl font-bold text-zinc-100 tabular-nums">{primaryMetrics.evaluated}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <CircularProgress 
                value={primaryMetrics.accuracy} 
                size={44} 
                strokeWidth={3}
                color={primaryMetrics.accuracy >= 55 ? 'text-emerald-400' : primaryMetrics.accuracy >= 45 ? 'text-amber-400' : 'text-rose-400'}
              />
              <Percent className={cn(
                'absolute h-4 w-4',
                primaryMetrics.accuracy >= 55 ? 'text-emerald-400' : primaryMetrics.accuracy >= 45 ? 'text-amber-400' : 'text-rose-400'
              )} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">10d Accuracy</p>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                primaryMetrics.accuracy >= 55 ? 'text-emerald-400' : primaryMetrics.accuracy >= 45 ? 'text-amber-400' : 'text-rose-400'
              )}>
                {primaryMetrics.accuracy.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              primaryMetrics.avgReturn >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            )}>
              {primaryMetrics.avgReturn >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs text-zinc-500">10d Avg Return</p>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                primaryMetrics.avgReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {primaryMetrics.avgReturn >= 0 ? '+' : ''}{primaryMetrics.avgReturn.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {checkpointMetrics.map(metrics => (
          <CheckpointCard key={metrics.type} metrics={metrics} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-300">Signal Distribution</p>
          </div>
          <div className="flex gap-2 mb-3">
            {buyPredictions.length > 0 && (
              <div 
                className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ flex: buyPredictions.length }}
                title={`BUY: ${buyPredictions.length}`}
              />
            )}
            {holdPredictions.length > 0 && (
              <div 
                className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                style={{ flex: holdPredictions.length }}
                title={`HOLD: ${holdPredictions.length}`}
              />
            )}
            {sellPredictions.length > 0 && (
              <div 
                className="h-2 rounded-full bg-rose-500 transition-all duration-500"
                style={{ flex: sellPredictions.length }}
                title={`SELL: ${sellPredictions.length}`}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">BUY</span>
              <span className="text-zinc-100 font-medium">{buyPredictions.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-zinc-400">HOLD</span>
              <span className="text-zinc-100 font-medium">{holdPredictions.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-zinc-400">SELL</span>
              <span className="text-zinc-100 font-medium">{sellPredictions.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-300">Checkpoint Completion</p>
          </div>
          <div className="space-y-3">
            {checkpointMetrics.map(metrics => {
              const completionPct = predictions.length > 0 
                ? (metrics.evaluated / predictions.length) * 100 
                : 0
              return (
                <div key={metrics.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('text-zinc-400', metrics.isPrimary && 'text-violet-400 font-medium')}>
                      {metrics.label}
                    </span>
                    <span className="text-zinc-100 font-medium tabular-nums">
                      {metrics.evaluated}/{predictions.length}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all duration-700 ease-out',
                        metrics.isPrimary ? 'bg-violet-500' : 'bg-zinc-600'
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}