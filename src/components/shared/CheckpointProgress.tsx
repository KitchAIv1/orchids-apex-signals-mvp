'use client'

import { cn } from '@/lib/utils'
import { Check, Clock, Target } from 'lucide-react'
import type { CheckpointEvaluation } from '@/types/database'

type CheckpointType = '5d' | '10d' | '20d'

type CheckpointDisplayConfig = {
  type: CheckpointType
  label: string
  tradingDays: number
  isPrimary: boolean
}

const CHECKPOINT_DISPLAY_CONFIGS: CheckpointDisplayConfig[] = [
  { type: '5d', label: 'Week 1', tradingDays: 5, isPrimary: false },
  { type: '10d', label: 'Week 2', tradingDays: 10, isPrimary: true },
  { type: '20d', label: 'Week 4', tradingDays: 20, isPrimary: false }
]

type CheckpointData = {
  type: CheckpointType
  evaluation: CheckpointEvaluation | null
  daysElapsed: number
}

type Props = {
  checkpoints: CheckpointData[]
  compact?: boolean
}

function formatReturnPct(returnPct: number): string {
  const sign = returnPct >= 0 ? '+' : ''
  return `${sign}${returnPct.toFixed(2)}%`
}

function CheckpointDot({ checkpoint, config }: { 
  checkpoint: CheckpointData
  config: CheckpointDisplayConfig 
}) {
  const isEvaluated = checkpoint.evaluation !== null
  const isReady = !isEvaluated && checkpoint.daysElapsed >= config.tradingDays
  const isPending = !isEvaluated && !isReady
  const isCorrect = checkpoint.evaluation?.directionalAccuracy

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
        isEvaluated && isCorrect && 'border-emerald-500 bg-emerald-500/20',
        isEvaluated && !isCorrect && 'border-rose-500 bg-rose-500/20',
        isReady && 'border-amber-500 bg-amber-500/20 animate-pulse',
        isPending && 'border-zinc-700 bg-zinc-800',
        config.isPrimary && 'h-10 w-10 border-[3px]'
      )}>
        {isEvaluated ? (
          <Check className={cn(
            'h-4 w-4',
            isCorrect ? 'text-emerald-400' : 'text-rose-400',
            config.isPrimary && 'h-5 w-5'
          )} />
        ) : isReady ? (
          <Target className={cn(
            'h-4 w-4 text-amber-400',
            config.isPrimary && 'h-5 w-5'
          )} />
        ) : (
          <Clock className={cn(
            'h-4 w-4 text-zinc-500',
            config.isPrimary && 'h-5 w-5'
          )} />
        )}
        {config.isPrimary && (
          <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-violet-500">
            <span className="text-[8px] font-bold text-white">P</span>
          </div>
        )}
      </div>
      <span className={cn(
        'text-[10px] font-medium',
        isEvaluated && isCorrect && 'text-emerald-400',
        isEvaluated && !isCorrect && 'text-rose-400',
        isReady && 'text-amber-400',
        isPending && 'text-zinc-500'
      )}>
        {config.label}
      </span>
      {isEvaluated && checkpoint.evaluation && (
        <span className={cn(
          'text-[10px] font-semibold tabular-nums',
          checkpoint.evaluation.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {formatReturnPct(checkpoint.evaluation.returnPct)}
        </span>
      )}
      {isPending && (
        <span className="text-[10px] text-zinc-600">
          {config.tradingDays - checkpoint.daysElapsed}d
        </span>
      )}
    </div>
  )
}

function ProgressConnector({ leftComplete, rightComplete }: { 
  leftComplete: boolean
  rightComplete: boolean 
}) {
  return (
    <div className="relative w-12 mx-1 self-start mt-4">
      <div className="w-full h-0.5 bg-zinc-800" />
      <div className={cn(
        'absolute top-0 left-0 h-0.5 transition-all duration-500',
        leftComplete && rightComplete && 'w-full bg-emerald-500',
        leftComplete && !rightComplete && 'w-1/2 bg-emerald-500',
        !leftComplete && 'w-0'
      )} />
    </div>
  )
}

export function CheckpointProgress({ checkpoints, compact = false }: Props) {
  const checkpointMap = new Map(checkpoints.map(c => [c.type, c]))

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {CHECKPOINT_DISPLAY_CONFIGS.map(config => {
          const checkpoint = checkpointMap.get(config.type)
          const isEvaluated = checkpoint?.evaluation !== null
          const isCorrect = checkpoint?.evaluation?.directionalAccuracy

          return (
            <div
              key={config.type}
              className={cn(
                'h-2 w-2 rounded-full',
                isEvaluated && isCorrect && 'bg-emerald-500',
                isEvaluated && !isCorrect && 'bg-rose-500',
                !isEvaluated && 'bg-zinc-700',
                config.isPrimary && 'h-2.5 w-2.5 ring-1 ring-violet-500/50'
              )}
              title={`${config.label}: ${isEvaluated ? (isCorrect ? 'Correct' : 'Incorrect') : 'Pending'}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-start">
      {CHECKPOINT_DISPLAY_CONFIGS.map((config, index) => {
        const checkpoint = checkpointMap.get(config.type)
        if (!checkpoint) return null

        const prevConfig = CHECKPOINT_DISPLAY_CONFIGS[index - 1]
        const prevCheckpoint = prevConfig ? checkpointMap.get(prevConfig.type) : null

        return (
          <div key={config.type} className="flex items-start">
            {index > 0 && (
              <ProgressConnector
                leftComplete={(prevCheckpoint?.evaluation !== null) || false}
                rightComplete={checkpoint.evaluation !== null}
              />
            )}
            <CheckpointDot checkpoint={checkpoint} config={config} />
          </div>
        )
      })}
    </div>
  )
}