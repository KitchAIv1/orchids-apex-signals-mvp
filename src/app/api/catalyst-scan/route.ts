import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { analyzeStock } from '@/services/AIAgentService'
import { 
  evaluateCatalystTrigger, 
  logCatalystWithSkip 
} from '@/services/CatalystTriggerService'
import { detectAllCatalysts } from '@/services/CatalystDetectionService'
import type { CatalystEvent } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 300

type CatalystWithStock = CatalystEvent & {
  stocks: { id: string; ticker: string; is_active: boolean }
}

interface ProcessingResult {
  ticker: string
  triggered: boolean
  skipReason: string | null
  gateResults: { gate: string; passed: boolean; reason: string }[]
}

/**
 * Manual catalyst scan endpoint - no auth required
 * This allows frontend to trigger scans without CRON_SECRET
 */
export async function POST() {
  try {
    console.log('🔍 Starting manual catalyst scan...')
    const detectionResult = await detectAllCatalysts()
    console.log(`📰 Detection complete: ${detectionResult.catalystsInserted} new catalysts`)

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentCatalysts, error: catalystError } = await supabase
      .from('catalyst_events')
      .select(`
        id,
        stock_id,
        event_type,
        urgency,
        description,
        detected_at,
        triggered_reanalysis,
        stocks!inner(id, ticker, is_active)
      `)
      .gte('detected_at', oneDayAgo)
      .is('triggered_reanalysis', null) as { data: CatalystWithStock[] | null; error: unknown }

    if (catalystError) {
      console.error('Error fetching catalysts:', catalystError)
      return NextResponse.json({ error: (catalystError as Error).message }, { status: 500 })
    }

    if (!recentCatalysts || recentCatalysts.length === 0) {
      return NextResponse.json({
        message: 'Catalyst scan complete. No new catalysts require processing.',
        detection: {
          stocksScanned: detectionResult.stocksScanned,
          catalystsDetected: detectionResult.catalystsDetected,
          catalystsInserted: detectionResult.catalystsInserted,
          errors: detectionResult.errors
        },
        processed: [],
        skipped: [],
        reanalyzed: []
      })
    }

    const stockCatalysts = new Map<string, CatalystWithStock[]>()
    for (const catalyst of recentCatalysts) {
      if (!catalyst.stocks.is_active) continue
      const existing = stockCatalysts.get(catalyst.stock_id) || []
      existing.push(catalyst)
      stockCatalysts.set(catalyst.stock_id, existing)
    }

    const results = {
      processed: [] as ProcessingResult[],
      reanalyzed: [] as string[],
      skipped: [] as { ticker: string; reason: string }[],
      failed: [] as { ticker: string; error: string }[]
    }

    for (const [stockId, catalysts] of stockCatalysts) {
      const highestUrgencyCatalyst = catalysts.reduce((highest, current) => {
        const urgencyRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        const currentRank = urgencyRank[current.urgency as keyof typeof urgencyRank] || 0
        const highestRank = urgencyRank[highest.urgency as keyof typeof urgencyRank] || 0
        return currentRank > highestRank ? current : highest
      })

      const decision = await evaluateCatalystTrigger(highestUrgencyCatalyst)
      const processingResult: ProcessingResult = {
        ticker: highestUrgencyCatalyst.stocks.ticker,
        triggered: decision.shouldTrigger,
        skipReason: decision.skipReason,
        gateResults: decision.gateResults
      }
      results.processed.push(processingResult)

      if (!decision.shouldTrigger) {
        for (const c of catalysts) {
          await logCatalystWithSkip(c.id, decision.skipReason || 'Gate check failed')
        }
        results.skipped.push({
          ticker: highestUrgencyCatalyst.stocks.ticker,
          reason: decision.skipReason || 'Gate check failed'
        })
        console.log(`⏭️ ${highestUrgencyCatalyst.stocks.ticker}: ${decision.skipReason}`)
        continue
      }

      try {
        console.log(`✓ All gates passed for ${highestUrgencyCatalyst.stocks.ticker} - Triggering re-analysis`)
        const analysisResult = await analyzeStock(highestUrgencyCatalyst.stocks.ticker)

        if (analysisResult.success) {
          results.reanalyzed.push(highestUrgencyCatalyst.stocks.ticker)

          for (const c of catalysts) {
            // @ts-expect-error - columns exist but types not regenerated
            await supabase
              .from('catalyst_events')
              .update({ triggered_reanalysis: true })
              .eq('id', c.id)
          }

          // @ts-expect-error - table exists but types not regenerated
          await supabase.from('recommendation_history').insert({
            stock_id: stockId,
            new_recommendation: analysisResult.recommendation || 'REANALYZED',
            new_score: analysisResult.score || 0,
            change_reason: `Catalyst-triggered: ${catalysts.map(c => c.event_type).join(', ')}`
          })
        } else {
          results.failed.push({
            ticker: highestUrgencyCatalyst.stocks.ticker,
            error: analysisResult.error || 'Analysis failed'
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.failed.push({ ticker: highestUrgencyCatalyst.stocks.ticker, error: message })
      }
    }

    const costSaved = results.skipped.length * 0.18
    return NextResponse.json({
      message: `Scan complete. Detected ${detectionResult.catalystsInserted} new events. Reanalyzed ${results.reanalyzed.length}, skipped ${results.skipped.length} (saved ~$${costSaved.toFixed(2)})`,
      detection: {
        stocksScanned: detectionResult.stocksScanned,
        catalystsDetected: detectionResult.catalystsDetected,
        catalystsInserted: detectionResult.catalystsInserted,
        errors: detectionResult.errors
      },
      catalystsFound: recentCatalysts.length,
      processed: results.processed,
      reanalyzed: results.reanalyzed,
      skipped: results.skipped,
      failed: results.failed
    })
  } catch (err) {
    console.error('Catalyst scan error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Manual catalyst scan endpoint. Use POST to trigger a scan.',
    note: 'This endpoint is for manual scanning from the UI without CRON auth.'
  })
}

