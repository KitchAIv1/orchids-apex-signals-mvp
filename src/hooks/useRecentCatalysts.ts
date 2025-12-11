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

      type CatalystRow = {
        id: string
        event_type: string
        urgency: string
        description: string | null
        detected_at: string
        triggered_reanalysis: boolean | null
        impact_on_score: number | null
        stocks: { ticker: string; company_name: string | null }
      }

      const { data: catalystRows, error: fetchError } = await supabase
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

      const mapped: RecentCatalyst[] = ((catalystRows || []) as CatalystRow[]).map((row) => {
        return {
          id: row.id,
          ticker: row.stocks.ticker,
          companyName: row.stocks.company_name,
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

// Re-export formatters for convenience (consumers can also import from utils directly)
export { getEventTypeLabel, getUrgencyColor } from '@/utils/catalystFormatters'
