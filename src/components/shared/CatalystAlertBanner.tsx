'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Bell, X, ChevronRight, Zap, Radar, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type CatalystAlert = {
  id: string
  ticker: string
  companyName: string
  eventType: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  detectedAt: string
  triggeredReanalysis: boolean
}

type Props = {
  className?: string
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    earnings_beat: 'Earnings Beat',
    earnings_miss: 'Earnings Miss',
    analyst_upgrade: 'Analyst Upgrade',
    analyst_downgrade: 'Analyst Downgrade',
    fda_approval: 'FDA Approval',
    fda_rejection: 'FDA Rejection',
    merger_announcement: 'Merger Announced',
    leadership_departure: 'Executive Departure',
    leadership_hire: 'New Executive',
    legal_action: 'Legal Action',
    product_launch: 'Product Launch',
    general_positive_news: 'Positive News',
    general_negative_news: 'Negative News'
  }
  return labels[eventType] || eventType.replace(/_/g, ' ')
}

type ScanResult = {
  message: string
  detection?: {
    stocksScanned: number
    catalystsDetected: number
    catalystsInserted: number
  }
}

export function CatalystAlertBanner({ className }: Props) {
  const [alerts, setAlerts] = useState<CatalystAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  useEffect(() => {
    fetchRecentAlerts()
  }, [])

  async function handleScan() {
    setScanning(true)
    setScanResult(null)
    try {
      const response = await fetch('/api/catalyst-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      setScanResult(result)
      setTimeout(() => fetchRecentAlerts(), 1000)
    } catch (error) {
      setScanResult({ message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setScanning(false)
    }
  }

  async function fetchRecentAlerts() {
    try {
      // Use 48 hours for broader visibility during testing, can reduce to 6-12 hours later
      const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('catalyst_events')
        .select(`
          id,
          event_type,
          urgency,
          description,
          detected_at,
          triggered_reanalysis,
          stocks!inner(ticker, company_name)
        `)
        .gte('detected_at', cutoffTime)
        .in('urgency', ['HIGH', 'CRITICAL'])
        .order('detected_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedAlerts: CatalystAlert[] = (data || []).map((row) => {
        const stocks = row.stocks as { ticker: string; company_name: string }
        return {
          id: row.id,
          ticker: stocks.ticker,
          companyName: stocks.company_name,
          eventType: row.event_type,
          urgency: row.urgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          description: row.description || '',
          detectedAt: row.detected_at,
          triggeredReanalysis: row.triggered_reanalysis || false
        }
      })

      setAlerts(formattedAlerts)
    } catch (err) {
      console.error('Failed to fetch catalyst alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id))

  const criticalCount = visibleAlerts.filter(a => a.urgency === 'CRITICAL').length
  const highCount = visibleAlerts.filter(a => a.urgency === 'HIGH').length

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      criticalCount > 0 
        ? 'border-rose-500/30 bg-rose-500/5' 
        : 'border-amber-500/30 bg-amber-500/5',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        criticalCount > 0 ? 'bg-rose-500/10' : 'bg-amber-500/10'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            criticalCount > 0 ? 'bg-rose-500/20' : 'bg-amber-500/20'
          )}>
            {criticalCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            ) : (
              <Bell className="h-5 w-5 text-amber-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className={cn(
              'text-sm font-semibold',
              criticalCount > 0 ? 'text-rose-300' : 'text-amber-300'
            )}>
              {criticalCount > 0 ? 'Critical Alerts' : 'New Catalyst Activity'}
            </h3>
            <p className="text-xs text-zinc-400">
              {criticalCount > 0 && `${criticalCount} critical, `}
              {highCount > 0 && `${highCount} high priority`}
              {' '}in the last 48 hours
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
              scanning
                ? 'bg-amber-500/20 text-amber-300 cursor-wait'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            )}
            title="Scan all stocks for new catalysts"
          >
            <Radar className={cn('h-3.5 w-3.5', scanning && 'animate-pulse')} />
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
          <button
            onClick={() => fetchRecentAlerts()}
            className="p-1.5 rounded hover:bg-zinc-800/50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-zinc-500', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
            className="text-zinc-500 hover:text-zinc-300 p-1"
            title="Dismiss all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && (
        <div className={cn(
          'px-4 py-2 text-xs border-b border-zinc-800/50',
          scanResult.detection ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
        )}>
          {scanResult.message}
          {scanResult.detection && (
            <span className="ml-2 text-zinc-400">
              Stocks: {scanResult.detection.stocksScanned}, 
              Detected: {scanResult.detection.catalystsDetected}, 
              New: {scanResult.detection.catalystsInserted}
            </span>
          )}
        </div>
      )}

      {/* Alert Items */}
      <div className="divide-y divide-zinc-800/50 max-h-[300px] overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm">
            Loading catalysts...
          </div>
        )}
        {!loading && visibleAlerts.length === 0 && (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm">
            No catalyst alerts. Click &quot;Scan Now&quot; to check for new catalysts.
          </div>
        )}
        {visibleAlerts.slice(0, 10).map(alert => (
          <Link key={alert.id} href={`/stock/${alert.ticker}`}>
            <div className={cn(
              'flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer',
              alert.urgency === 'CRITICAL' && 'bg-rose-500/5'
            )}>
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                alert.urgency === 'CRITICAL' ? 'bg-rose-500/20' : 'bg-amber-500/20'
              )}>
                <Zap className={cn(
                  'h-4 w-4',
                  alert.urgency === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-semibold text-zinc-200 text-sm">
                    {alert.ticker}
                  </span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    alert.urgency === 'CRITICAL' 
                      ? 'bg-rose-500/20 text-rose-400' 
                      : 'bg-amber-500/20 text-amber-400'
                  )}>
                    {getEventLabel(alert.eventType)}
                  </span>
                  {alert.triggeredReanalysis && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                      Reanalyzed
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-1">
                  {alert.description}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {visibleAlerts.length > 10 && (
        <div className="px-4 py-2 text-center border-t border-zinc-800/50 text-xs text-zinc-500">
          Showing 10 of {visibleAlerts.length} alerts
        </div>
      )}
    </div>
  )
}

