'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatDate, formatDistanceToNow, getRecommendationColor } from '@/utils/formatters'
import { Clock, PlayCircle, Loader2, ChevronRight, TrendingUp, RefreshCw } from 'lucide-react'
import { CheckpointProgress } from './CheckpointProgress'
import { ScoreRing } from './ScoreRing'
import { ConfidenceBar } from './ConfidenceBar'
import { LivePriceDisplay } from './LivePriceDisplay'
import { CheckpointEvaluationResult } from './CheckpointEvaluationResult'
import type { Prediction, Stock, CheckpointEvaluation } from '@/types/database'
import type { StockPrice } from '@/hooks/useStockPrices'
import { 
  getDaysElapsedDisplay, 
  isCheckpointReady,
  type CheckpointType 
} from '@/utils/checkpointCalculations'

type Props = {
  prediction: Prediction & { stock?: Stock }
  showTicker?: boolean
  price?: StockPrice
  onEvaluated?: () => void
}

function getDayProgressDisplay(daysElapsed: number): { label: string; checkpoint: number; remaining: number } {
  // Determine which checkpoint we're tracking toward
  if (daysElapsed < 5) {
    return { label: `Day ${daysElapsed}`, checkpoint: 5, remaining: 5 - daysElapsed }
  } else if (daysElapsed < 10) {
    return { label: `Day ${daysElapsed}`, checkpoint: 10, remaining: 10 - daysElapsed }
  } else if (daysElapsed < 20) {
    return { label: `Day ${daysElapsed}`, checkpoint: 20, remaining: 20 - daysElapsed }
  }
  return { label: `Day ${daysElapsed}`, checkpoint: 20, remaining: 0 }
}

function buildCheckpointDataList(prediction: Prediction, daysElapsed: number) {
  const checkpointTypes: CheckpointType[] = ['5d', '10d', '20d']
  return checkpointTypes.map(type => ({
    type,
    evaluation: prediction[`evaluation_${type}` as keyof Prediction] as CheckpointEvaluation | null,
    daysElapsed,
    predictedAt: prediction.predicted_at
  }))
}

function getReadyCheckpoints(
  checkpoints: { type: CheckpointType; evaluation: CheckpointEvaluation | null; predictedAt: string }[]
) {
  // Use shared utility for consistent "ready" determination
  return checkpoints.filter(c => isCheckpointReady(c.predictedAt, c.type, !!c.evaluation))
}

export function PredictionCard({ prediction, showTicker = true, price, onEvaluated }: Props) {
  const router = useRouter()
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationMessage, setEvaluationMessage] = useState<string | null>(null)

  const daysElapsed = useMemo(() => getDaysElapsedDisplay(prediction.predicted_at), [prediction.predicted_at])
  const dayProgress = useMemo(() => getDayProgressDisplay(daysElapsed), [daysElapsed])
  const checkpointDataList = useMemo(() => buildCheckpointDataList(prediction, daysElapsed), [prediction, daysElapsed])
  const readyCheckpoints = useMemo(() => getReadyCheckpoints(checkpointDataList), [checkpointDataList])
  const primaryEvaluation = prediction.evaluation_10d
  const updatedTimeAgo = useMemo(() => formatDistanceToNow(prediction.predicted_at), [prediction.predicted_at])

  const handleEvaluateCheckpoints = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (readyCheckpoints.length === 0) return
    
    setIsEvaluating(true)
    setEvaluationMessage(null)
    
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          predictionIds: [prediction.id],
          autoEvaluate: true
        })
      })
      
      const responseData = await response.json()
      const successCount = responseData.results?.filter((r: { success: boolean }) => r.success).length || 0
      
      if (successCount > 0) {
        setEvaluationMessage(`Evaluated ${successCount} checkpoint(s)`)
        onEvaluated?.()
      } else {
        setEvaluationMessage('No checkpoints ready')
      }
    } catch {
      setEvaluationMessage('Evaluation failed')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleTradeThis = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const confidenceLevel = confidence === 'HIGH' ? 85 : confidence === 'MEDIUM' ? 65 : 45
    const params = new URLSearchParams({
      ticker: stock?.ticker || '',
      prediction: prediction.id,
      confidence: String(confidenceLevel),
      direction: recommendation
    })
    router.push(`/paper-trading?${params.toString()}`)
  }

  const { stock, recommendation, final_score, confidence, predicted_at } = prediction
  const recColor = getRecommendationColor(recommendation)
  const hasAnyEvaluation = checkpointDataList.some(c => c.evaluation !== null)
  const stockLink = stock?.ticker ? `/stock/${stock.ticker}` : '#'

  return (
    <Link 
      href={stockLink}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-amber-500/50 hover:bg-zinc-900/70 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {showTicker && stock && (
              <span className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                {stock.ticker}
              </span>
            )}
            <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide', recColor)}>
              {recommendation}
            </span>
            <CheckpointProgress checkpoints={checkpointDataList} compact />
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-xs text-zinc-500 flex items-center gap-1" title={`Analyzed: ${formatDate(predicted_at)}`}>
              <RefreshCw className="h-3 w-3" />
              Updated {updatedTimeAgo}
            </p>
            <span className="text-xs text-zinc-600">•</span>
            <p className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" />
              <span className="text-amber-400 font-medium">
                {dayProgress.label} → {dayProgress.checkpoint}d
              </span>
              {dayProgress.remaining > 0 && (
                <span className="text-zinc-600">
                  ({dayProgress.remaining} to go)
                </span>
              )}
            </p>
            <ConfidenceBar confidence={confidence} />
          </div>
          
          {price && (
            <div className="mt-3">
              <LivePriceDisplay price={price} />
            </div>
          )}

          {stock?.ticker && recommendation === 'BUY' && (
            <button
              onClick={handleTradeThis}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 transition-all"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Trade This
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ScoreRing score={final_score} size={44} />
          <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/50">
        <CheckpointProgress checkpoints={checkpointDataList} />
      </div>
      
      {primaryEvaluation && (
        <CheckpointEvaluationResult 
          evaluation={primaryEvaluation} 
          label="Primary (10d)" 
          isPrimary 
        />
      )}

      {!hasAnyEvaluation && readyCheckpoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400">
              {readyCheckpoints.length} checkpoint(s) ready for evaluation
            </span>
            <button
              onClick={handleEvaluateCheckpoints}
              disabled={isEvaluating}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30',
                isEvaluating && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isEvaluating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              Evaluate Now
            </button>
          </div>
        </div>
      )}
      
      {evaluationMessage && (
        <div className={cn(
          'mt-2 px-3 py-2 rounded-lg text-xs',
          evaluationMessage.includes('failed') ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
        )}>
          {evaluationMessage}
        </div>
      )}
    </Link>
  )
}