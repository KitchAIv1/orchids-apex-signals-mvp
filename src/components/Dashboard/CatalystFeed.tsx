'use client'

import { useState } from 'react'
import { Zap, RefreshCw, Clock, TrendingUp, TrendingDown, AlertTriangle, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecentCatalysts, getEventTypeLabel, getUrgencyColor } from '@/hooks/useRecentCatalysts'
import { formatDistanceToNow } from '@/utils/formatters'
import Link from 'next/link'

function CatalystItem({ catalyst }: { catalyst: ReturnType<typeof useRecentCatalysts>['catalysts'][0] }) {
  const timeAgo = formatDistanceToNow(catalyst.detectedAt)
  const isPositive = catalyst.scoreChange !== null && catalyst.scoreChange > 0
  const isNegative = catalyst.scoreChange !== null && catalyst.scoreChange < 0
  const eventLabel = getEventTypeLabel(catalyst.eventType)

  return (
    <Link href={`/stock/${catalyst.ticker}`}>
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-all duration-200',
        'hover:bg-zinc-800/50 cursor-pointer group'
      )}>
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          catalyst.urgency === 'CRITICAL' && 'bg-rose-500/20',
          catalyst.urgency === 'HIGH' && 'bg-amber-500/20',
          catalyst.urgency === 'MEDIUM' && 'bg-sky-500/20',
          catalyst.urgency === 'LOW' && 'bg-zinc-500/20'
        )}>
          {catalyst.urgency === 'CRITICAL' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          ) : (
            <Zap className={cn(
              'h-4 w-4',
              catalyst.urgency === 'HIGH' && 'text-amber-400',
              catalyst.urgency === 'MEDIUM' && 'text-sky-400',
              catalyst.urgency === 'LOW' && 'text-zinc-400'
            )} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-semibold text-zinc-100 text-sm group-hover:text-white">
              {catalyst.ticker}
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium border',
              getUrgencyColor(catalyst.urgency)
            )}>
              {catalyst.urgency}
            </span>
          </div>
          
          <p className="text-xs text-zinc-400 mb-1">{eventLabel}</p>
          
          <div className="flex items-center gap-3">
            {catalyst.scoreChange !== null && (
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive && 'text-emerald-400',
                isNegative && 'text-rose-400',
                !isPositive && !isNegative && 'text-zinc-500'
              )}>
                {isPositive && <TrendingUp className="h-3 w-3" />}
                {isNegative && <TrendingDown className="h-3 w-3" />}
                {isPositive ? '+' : ''}{catalyst.scoreChange.toFixed(1)} pts
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
          </div>
        </div>

        {catalyst.triggeredReanalysis && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-medium border border-emerald-500/20">
              <RefreshCw className="h-2.5 w-2.5" />
              Reanalyzed
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

type ScanResult = {
  message: string
  detection?: {
    stocksScanned: number
    catalystsDetected: number
    catalystsInserted: number
    errors: string[]
  }
  reanalyzed?: string[]
}

export function CatalystFeed() {
  const { catalysts, loading, lastUpdated, refetch } = useRecentCatalysts(48)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  const highUrgencyCount = catalysts.filter(c => 
    c.urgency === 'HIGH' || c.urgency === 'CRITICAL'
  ).length

  const handleScanForCatalysts = async () => {
    setScanning(true)
    setScanResult(null)
    
    try {
      // Use manual scan endpoint (no CRON auth required)
      const response = await fetch('/api/catalyst-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      setScanResult(result)
      
      // Refresh the catalyst list after scan
      setTimeout(() => refetch(), 1000)
    } catch (error) {
      setScanResult({ 
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="h-4 w-4 text-amber-400" />
            {highUrgencyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Live Activity</h3>
          {highUrgencyCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[10px] font-medium">
              {highUrgencyCount} urgent
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleScanForCatalysts}
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
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-zinc-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && (
        <div className={cn(
          'px-4 py-2 text-xs border-b border-zinc-800/60',
          scanResult.detection?.catalystsInserted 
            ? 'bg-emerald-500/10 text-emerald-300' 
            : 'bg-zinc-800/50 text-zinc-400'
        )}>
          <div className="flex items-center justify-between">
            <span>{scanResult.message}</span>
            <button 
              onClick={() => setScanResult(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          </div>
          {scanResult.detection && (
            <div className="flex gap-4 mt-1 text-[10px] text-zinc-500">
              <span>Stocks: {scanResult.detection.stocksScanned}</span>
              <span>Detected: {scanResult.detection.catalystsDetected}</span>
              <span>New: {scanResult.detection.catalystsInserted}</span>
              {scanResult.reanalyzed && scanResult.reanalyzed.length > 0 && (
                <span className="text-emerald-400">
                  Reanalyzed: {scanResult.reanalyzed.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="divide-y divide-zinc-800/40 max-h-[400px] overflow-y-auto">
        {loading && catalysts.length === 0 ? (
          <div className="p-4 text-center">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Loading activity...</p>
          </div>
        ) : catalysts.length === 0 ? (
          <div className="p-6 text-center">
            <Zap className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No recent catalyst activity</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Monitoring runs 4x daily on trading days
            </p>
          </div>
        ) : (
          catalysts.map(catalyst => (
            <CatalystItem key={catalyst.id} catalyst={catalyst} />
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-zinc-800/60 bg-zinc-900/80">
        <div className="flex items-center justify-between text-[10px] text-zinc-600">
          <span>Manual scan available • Auto: Weekly (Sundays)</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </div>
  )
}

