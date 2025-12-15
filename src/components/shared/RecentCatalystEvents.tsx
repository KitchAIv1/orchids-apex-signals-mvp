'use client'

import { Zap, ExternalLink, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/utils/formatters'
import type { CatalystEvent } from '@/types/database'

type Props = {
  catalysts: CatalystEvent[]
  maxItems?: number
}

function getUrgencyStyle(urgency: string) {
  switch (urgency) {
    case 'CRITICAL':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    case 'HIGH':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'MEDIUM':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  }
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    earnings_beat: '📈 Earnings Beat',
    earnings_miss: '📉 Earnings Miss',
    earnings_report: '📊 Earnings Report',
    analyst_upgrade: '⬆️ Analyst Upgrade',
    analyst_downgrade: '⬇️ Analyst Downgrade',
    analyst_update: '📋 Analyst Update',
    fda_approval: '✅ FDA Approval',
    fda_rejection: '❌ FDA Rejection',
    fda_update: '🏥 FDA Update',
    merger_announcement: '🤝 Merger Announced',
    merger_failed: '💔 Merger Failed',
    merger_rumor: '💭 Merger Rumor',
    leadership_hire: '👔 New Executive',
    leadership_departure: '🚪 Executive Departure',
    leadership_change: '🔄 Leadership Change',
    legal_victory: '⚖️ Legal Victory',
    legal_action: '⚠️ Legal Action',
    legal_update: '📑 Legal Update',
    product_launch: '🚀 Product Launch',
    product_recall: '🔙 Product Recall',
    product_update: '📦 Product Update',
    general_positive_news: '📰 Positive News',
    general_negative_news: '📰 Negative News',
    AI_ANALYSIS: '🤖 AI Analysis'
  }
  return labels[eventType] || eventType.replace(/_/g, ' ')
}

function CatalystEventItem({ catalyst }: { catalyst: CatalystEvent }) {
  const timeAgo = formatDistanceToNow(catalyst.detected_at)
  const eventLabel = getEventLabel(catalyst.event_type)
  const isCritical = catalyst.urgency === 'CRITICAL' || catalyst.urgency === 'HIGH'

  return (
    <div className={cn(
      'flex gap-3 py-3 border-b border-zinc-800/50 last:border-b-0',
      isCritical && 'bg-amber-500/5 -mx-3 px-3 rounded-lg'
    )}>
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        catalyst.urgency === 'CRITICAL' && 'bg-rose-500/20',
        catalyst.urgency === 'HIGH' && 'bg-amber-500/20',
        catalyst.urgency === 'MEDIUM' && 'bg-sky-500/20',
        catalyst.urgency === 'LOW' && 'bg-zinc-700/50'
      )}>
        {isCritical ? (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        ) : (
          <Zap className="h-4 w-4 text-zinc-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-zinc-200">
            {eventLabel}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium border',
            getUrgencyStyle(catalyst.urgency)
          )}>
            {catalyst.urgency}
          </span>
          {catalyst.triggered_reanalysis && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Triggered Re-analysis
            </span>
          )}
        </div>
        
        {catalyst.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 mb-1">
            {catalyst.description}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo}
          </span>
          {catalyst.impact_on_score && (
            <span className={cn(
              'font-medium',
              catalyst.impact_on_score > 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              Impact: {catalyst.impact_on_score > 0 ? '+' : ''}{catalyst.impact_on_score}
            </span>
          )}
          {catalyst.source_url && (
            <a 
              href={catalyst.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-sky-400 hover:text-sky-300"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export function RecentCatalystEvents({ catalysts, maxItems = 5 }: Props) {
  const visibleCatalysts = catalysts.slice(0, maxItems)
  
  if (visibleCatalysts.length === 0) {
    return null
  }

  const criticalCount = catalysts.filter(c => 
    c.urgency === 'CRITICAL' || c.urgency === 'HIGH'
  ).length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Recent Catalyst Events
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-400">
              {criticalCount} urgent
            </span>
          )}
        </h3>
        <span className="text-[10px] text-zinc-500">
          Last {catalysts.length} events
        </span>
      </div>
      
      <div className="space-y-1">
        {visibleCatalysts.map(catalyst => (
          <CatalystEventItem key={catalyst.id} catalyst={catalyst} />
        ))}
      </div>
      
      {catalysts.length > maxItems && (
        <p className="text-[10px] text-zinc-500 mt-2 text-center">
          +{catalysts.length - maxItems} more events
        </p>
      )}
    </div>
  )
}

