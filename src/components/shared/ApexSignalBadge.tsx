'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Zap, User, Target } from 'lucide-react'
import type { ApexSignal } from '@/services/PaperTradingService'

type Props = {
  signal: ApexSignal
}

export function ApexSignalBadge({ signal }: Props) {
  const { currentRecommendation, currentScore, signalChanged, entrySignal } = signal

  if (!currentRecommendation) {
    return (
      <div className="flex items-center justify-center gap-1.5 opacity-50" title="Not tracked by APEX">
        <User className="h-4 w-4 text-zinc-600" />
        <span className="text-xs text-zinc-500">Manual</span>
      </div>
    )
  }

  const recColor = {
    BUY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    HOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    SELL: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }[currentRecommendation]

  const scoreColor = (currentScore || 0) >= 65 ? 'bg-emerald-500' 
    : (currentScore || 0) <= 35 ? 'bg-rose-500' 
    : 'bg-amber-500'

  const isMajorChange = signalChanged && (
    (entrySignal === 'BUY' && currentRecommendation === 'SELL') ||
    (entrySignal === 'SELL' && currentRecommendation === 'BUY')
  )

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Primary Badge */}
      <div className={cn(
        'flex items-center gap-2 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-sm',
        recColor
      )}>
        <span className="text-xs font-bold tracking-wide">
          {currentRecommendation}
        </span>
        
        {/* Score Dot */}
        {currentScore !== null && (
          <div className="flex items-center gap-1 pl-1.5 border-l border-white/10" title={`APEX Score: ${currentScore}`}>
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", scoreColor)} />
            <span className="text-[10px] font-medium opacity-90">{currentScore}</span>
          </div>
        )}
      </div>
      
      {/* Secondary Context (Changes/Entry) */}
      <div className="flex items-center gap-2 h-4">
        {signalChanged ? (
          <div 
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-1.5 rounded-sm',
              isMajorChange ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
            )}
            title={`Signal changed from ${entrySignal} to ${currentRecommendation}`}
          >
            {isMajorChange ? <AlertTriangle className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            <span>Flip</span>
          </div>
        ) : entrySignal ? (
          <div className="flex items-center gap-1 text-zinc-500" title={`Entry Signal: ${entrySignal}`}>
            <Target className="h-3 w-3" />
            <span className="text-[10px]">Entry: {entrySignal}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-zinc-600" title="Manual Trade (Not Validated)">
            <User className="h-3 w-3" />
            <span className="text-[10px]">Manual</span>
          </div>
        )}
      </div>
    </div>
  )
}
