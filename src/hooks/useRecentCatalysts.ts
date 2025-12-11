'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type RecentCatalyst = {
  id: string
  ticker: string
  companyName: string | null
  eventType: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string | null
  detectedAt: string
  triggeredReanalysis: boolean | null
  scoreChange: number | null
}

type UseRecentCatalystsReturn = {
  catalysts: RecentCatalyst[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => Promise<void>
}

export function useRecentCatalysts(hoursBack: number = 24): UseRecentCatalystsReturn {
  const [catalysts, setCatalysts] = useState<RecentCatalyst[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCatalysts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

      const { data, error: fetchError } = await supabase
        .from('catalyst_events')
        .select(`
          id,
          event_type,
          urgency,
          description,
          detected_at,
          triggered_reanalysis,
          impact_on_score,
          stocks!inner(ticker, company_name)
        `)
        .gte('detected_at', cutoffTime)
        .order('detected_at', { ascending: false })
        .limit(20)

      if (fetchError) throw fetchError

      const mapped: RecentCatalyst[] = (data || []).map((row) => {
        const stockData = row.stocks as unknown as { ticker: string; company_name: string | null }
        return {
          id: row.id,
          ticker: stockData.ticker,
          companyName: stockData.company_name,
          eventType: row.event_type,
          urgency: row.urgency as RecentCatalyst['urgency'],
          description: row.description,
          detectedAt: row.detected_at,
          triggeredReanalysis: row.triggered_reanalysis,
          scoreChange: row.impact_on_score
        }
      })

      setCatalysts(mapped)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch catalysts')
    } finally {
      setLoading(false)
    }
  }, [hoursBack])

  useEffect(() => {
    fetchCatalysts()
    
    const interval = setInterval(fetchCatalysts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchCatalysts])

  return { catalysts, loading, error, lastUpdated, refetch: fetchCatalysts }
}

export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    earnings_beat: 'Earnings Beat',
    earnings_miss: 'Earnings Miss',
    fda_approval: 'FDA Approval',
    fda_rejection: 'FDA Rejection',
    contract_win: 'Contract Win',
    contract_loss: 'Contract Loss',
    analyst_upgrade: 'Analyst Upgrade',
    analyst_downgrade: 'Analyst Downgrade',
    insider_buying: 'Insider Buying',
    insider_selling: 'Insider Selling',
    price_spike_up: 'Price Surge',
    price_spike_down: 'Price Drop',
    general_positive_news: 'Positive News',
    general_negative_news: 'Negative News',
    leadership_change: 'Leadership Change',
    AI_ANALYSIS: 'AI Analysis'
  }
  return labels[eventType] || eventType.replace(/_/g, ' ')
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    case 'HIGH': return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    case 'MEDIUM': return 'text-sky-400 bg-sky-500/15 border-sky-500/30'
    default: return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30'
  }
}

