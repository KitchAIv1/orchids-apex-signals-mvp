'use client'

import { cn } from '@/lib/utils'
import type { Prediction } from '@/types/database'
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent } from 'lucide-react'
import { CircularProgress } from './CircularProgress'
import { CheckpointCard, calculateCheckpointMetrics, getAccuracyColor } from './CheckpointCard'

type Props = {
  predictions: Prediction[]
}

export function AccuracyMetrics({ predictions }: Props) {
  const checkpointMetrics = [
    calculateCheckpointMetrics(predictions, '5d', 'Week 1 (5d)', false),
    calculateCheckpointMetrics(predictions, '10d', 'Week 2 (10d)', true),
    calculateCheckpointMetrics(predictions, '20d', 'Week 4 (20d)', false)
  ]

  const primaryMetrics = checkpointMetrics.find(m => m.isPrimary)!
  const primaryAccuracyColor = getAccuracyColor(primaryMetrics.accuracy)
  
  const buyPredictions = predictions.filter(p => p.recommendation === 'BUY')
  const holdPredictions = predictions.filter(p => p.recommendation === 'HOLD')
  const sellPredictions = predictions.filter(p => p.recommendation === 'SELL')

  return (
    <div className="space-y-4">
      {/* Summary Stats Row */}
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
                color={primaryAccuracyColor}
              />
              <Percent className={cn('absolute h-4 w-4', primaryAccuracyColor)} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">10d Accuracy</p>
              <p className={cn('text-2xl font-bold tabular-nums', primaryAccuracyColor)}>
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

      {/* Checkpoint Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {checkpointMetrics.map(metrics => (
          <CheckpointCard key={metrics.type} metrics={metrics} />
        ))}
      </div>

      {/* Distribution & Completion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signal Distribution */}
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

        {/* Checkpoint Completion */}
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
