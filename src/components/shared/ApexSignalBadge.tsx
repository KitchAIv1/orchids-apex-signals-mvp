'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Zap } from 'lucide-react'
import type { ApexSignal } from '@/services/PaperTradingService'

type Props = {
  signal: ApexSignal
}

export function ApexSignalBadge({ signal }: Props) {
  const { currentRecommendation, currentScore, signalChanged, entrySignal } = signal

  if (!currentRecommendation) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-zinc-600 uppercase">No Signal</span>
        <span className="text-xs text-zinc-500">Not in APEX</span>
      </div>
    )
  }

  const recColor = {
    BUY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    HOLD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    SELL: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  }[currentRecommendation]

  const isMajorChange = signalChanged && (
    (entrySignal === 'BUY' && currentRecommendation === 'SELL') ||
    (entrySignal === 'SELL' && currentRecommendation === 'BUY')
  )

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-bold border',
          recColor
        )}>
          {currentRecommendation}
        </span>
        {currentScore !== null && (
          <span className="text-xs text-zinc-500">{currentScore}</span>
        )}
      </div>
      
      {signalChanged && (
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
          isMajorChange 
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        )}>
          {isMajorChange ? (
            <AlertTriangle className="h-2.5 w-2.5" />
          ) : (
            <Zap className="h-2.5 w-2.5" />
          )}
          <span>
            {entrySignal} → {currentRecommendation}
          </span>
        </div>
      )}
      
      {!signalChanged && entrySignal && (
        <span className="text-[10px] text-zinc-600">
          Entry: {entrySignal}
        </span>
      )}
      
      {!entrySignal && (
        <span className="text-[10px] text-zinc-600">
          Manual trade
        </span>
      )}
    </div>
  )
}

