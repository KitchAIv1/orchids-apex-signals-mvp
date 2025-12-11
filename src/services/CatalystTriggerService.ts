import { supabase } from '@/lib/supabase'
import type { CatalystEvent, Prediction } from '@/types/database'

type CatalystUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type CatalystType = 
  | 'earnings_beat' | 'earnings_miss'
  | 'fda_approval' | 'fda_rejection'
  | 'contract_win' | 'contract_loss'
  | 'analyst_upgrade' | 'analyst_downgrade'
  | 'insider_buying' | 'insider_selling'
  | 'price_spike_up' | 'price_spike_down'
  | 'general_positive_news' | 'general_negative_news'
  | 'leadership_change'

interface CatalystWithStock extends CatalystEvent {
  stocks: { id: string; ticker: string; is_active: boolean }
}

interface CurrentRecommendationData {
  score: number
  confidence: string
  lastAnalyzedAt: Date
  recommendation: string
}

interface GateResult {
  passed: boolean
  reason: string
}

const RECOMMENDATION_BOUNDARIES = [35, 45, 65, 75]

const COOLDOWN_HOURS = 6
const MAX_REANALYSES_PER_DAY = 3

const CATALYST_IMPACT_MAP: Record<string, number> = {
  earnings_beat: 10,
  earnings_miss: -10,
  fda_approval: 12,
  fda_rejection: -15,
  contract_win: 8,
  contract_loss: -8,
  analyst_upgrade: 4,
  analyst_downgrade: -4,
  insider_buying: 3,
  insider_selling: -2,
  price_spike_up: 5,
  price_spike_down: -5,
  general_positive_news: 2,
  general_negative_news: -2,
  leadership_change: -3
}

const URGENCY_MULTIPLIER: Record<CatalystUrgency, number> = {
  CRITICAL: 1.5,
  HIGH: 1.0,
  MEDIUM: 0.7,
  LOW: 0.5
}

export function calculateBoundaryProximity(score: number): number {
  const distances = RECOMMENDATION_BOUNDARIES.map(b => Math.abs(score - b))
  return Math.min(...distances)
}

export function estimateCatalystImpact(
  catalystType: string,
  urgency: CatalystUrgency
): number {
  const baseImpact = CATALYST_IMPACT_MAP[catalystType] || 0
  const multiplier = URGENCY_MULTIPLIER[urgency] || 1.0
  return baseImpact * multiplier
}

export async function getCurrentRecommendation(
  stockId: string
): Promise<CurrentRecommendationData | null> {
  const { data } = await supabase
    .from('predictions')
    .select('final_score, confidence, predicted_at, recommendation')
    .eq('stock_id', stockId)
    .order('predicted_at', { ascending: false })
    .limit(1)
    .single() as { data: Prediction | null }

  if (!data) return null

  return {
    score: Number(data.final_score),
    confidence: data.confidence,
    lastAnalyzedAt: new Date(data.predicted_at),
    recommendation: data.recommendation
  }
}

export async function getReanalysisCount24h(stockId: string): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { count } = await supabase
    .from('recommendation_history')
    .select('*', { count: 'exact', head: true })
    .eq('stock_id', stockId)
    .gte('changed_at', twentyFourHoursAgo.toISOString())
    .like('change_reason', '%Catalyst-triggered%')

  return count || 0
}

export async function logCatalystWithSkip(
  catalystId: string,
  reason: string
): Promise<void> {
  // @ts-expect-error - columns exist but types not regenerated
  await supabase
    .from('catalyst_events')
    .update({ triggered_reanalysis: false, skip_reason: reason })
    .eq('id', catalystId)

  console.log(`⏭️ Skipped re-analysis: ${reason}`)
}

function checkGate1Urgency(urgency: CatalystUrgency): GateResult {
  if (urgency === 'LOW' || urgency === 'MEDIUM') {
    return { passed: false, reason: `Urgency too low (${urgency})` }
  }
  return { passed: true, reason: 'Urgency HIGH or CRITICAL' }
}

function checkGate2BoundaryProximity(
  score: number,
  urgency: CatalystUrgency
): GateResult {
  const proximity = calculateBoundaryProximity(score)
  if (proximity > 10 && urgency !== 'CRITICAL') {
    return { 
      passed: false, 
      reason: `Score ${score} too far from boundary (${proximity} points)` 
    }
  }
  return { passed: true, reason: `Score ${score} near boundary (${proximity} points)` }
}

function checkGate3PredictedImpact(
  catalystType: string,
  urgency: CatalystUrgency,
  boundaryProximity: number
): GateResult {
  const impact = Math.abs(estimateCatalystImpact(catalystType, urgency))
  if (impact < boundaryProximity && urgency !== 'CRITICAL') {
    return { 
      passed: false, 
      reason: `Impact ${impact.toFixed(1)} insufficient to reach boundary (${boundaryProximity} points away)` 
    }
  }
  return { passed: true, reason: `Impact ${impact.toFixed(1)} could change recommendation` }
}

function checkGate4Cooldown(
  lastAnalyzedAt: Date,
  reanalysisCount: number,
  urgency: CatalystUrgency
): GateResult {
  const hoursSince = (Date.now() - lastAnalyzedAt.getTime()) / (1000 * 60 * 60)
  
  if (hoursSince < COOLDOWN_HOURS && urgency !== 'CRITICAL') {
    return { 
      passed: false, 
      reason: `Cooldown active (${hoursSince.toFixed(1)}h since last analysis)` 
    }
  }
  
  if (reanalysisCount >= MAX_REANALYSES_PER_DAY) {
    return { 
      passed: false, 
      reason: `Daily limit reached (${reanalysisCount} re-analyses in 24h)` 
    }
  }
  
  return { passed: true, reason: 'Cooldown passed' }
}

function checkGate5Confidence(
  confidence: string,
  impact: number,
  urgency: CatalystUrgency
): GateResult {
  const confidencePercent = parseConfidence(confidence)
  
  if (confidencePercent > 85 && urgency !== 'CRITICAL') {
    const confidenceThreshold = 8
    if (Math.abs(impact) < confidenceThreshold) {
      return { 
        passed: false, 
        reason: `High confidence (${confidencePercent}%) resists weak catalyst` 
      }
    }
  }
  
  return { passed: true, reason: `Confidence ${confidencePercent}% allows re-analysis` }
}

function parseConfidence(confidence: string): number {
  if (confidence.toLowerCase() === 'high') return 85
  if (confidence.toLowerCase() === 'medium') return 70
  if (confidence.toLowerCase() === 'low') return 55
  const parsed = parseInt(confidence.replace('%', ''), 10)
  return isNaN(parsed) ? 70 : parsed
}

export interface TriggerDecision {
  shouldTrigger: boolean
  skipReason: string | null
  gateResults: { gate: string; passed: boolean; reason: string }[]
}

export async function evaluateCatalystTrigger(
  catalyst: CatalystWithStock
): Promise<TriggerDecision> {
  const gateResults: { gate: string; passed: boolean; reason: string }[] = []
  const urgency = catalyst.urgency as CatalystUrgency
  const catalystType = catalyst.event_type as CatalystType

  const gate1 = checkGate1Urgency(urgency)
  gateResults.push({ gate: 'Gate1_Urgency', ...gate1 })
  if (!gate1.passed) {
    return { shouldTrigger: false, skipReason: gate1.reason, gateResults }
  }

  const currentRec = await getCurrentRecommendation(catalyst.stock_id)
  if (!currentRec) {
    return { 
      shouldTrigger: true, 
      skipReason: null, 
      gateResults: [...gateResults, { 
        gate: 'NoExistingAnalysis', 
        passed: true, 
        reason: 'No prior analysis found - trigger first analysis' 
      }]
    }
  }

  const boundaryProximity = calculateBoundaryProximity(currentRec.score)
  const gate2 = checkGate2BoundaryProximity(currentRec.score, urgency)
  gateResults.push({ gate: 'Gate2_BoundaryProximity', ...gate2 })
  if (!gate2.passed) {
    return { shouldTrigger: false, skipReason: gate2.reason, gateResults }
  }

  const gate3 = checkGate3PredictedImpact(catalystType, urgency, boundaryProximity)
  gateResults.push({ gate: 'Gate3_PredictedImpact', ...gate3 })
  if (!gate3.passed) {
    return { shouldTrigger: false, skipReason: gate3.reason, gateResults }
  }

  const reanalysisCount = await getReanalysisCount24h(catalyst.stock_id)
  const gate4 = checkGate4Cooldown(currentRec.lastAnalyzedAt, reanalysisCount, urgency)
  gateResults.push({ gate: 'Gate4_Cooldown', ...gate4 })
  if (!gate4.passed) {
    return { shouldTrigger: false, skipReason: gate4.reason, gateResults }
  }

  const predictedImpact = estimateCatalystImpact(catalystType, urgency)
  const gate5 = checkGate5Confidence(currentRec.confidence, predictedImpact, urgency)
  gateResults.push({ gate: 'Gate5_Confidence', ...gate5 })
  if (!gate5.passed) {
    return { shouldTrigger: false, skipReason: gate5.reason, gateResults }
  }

  return { shouldTrigger: true, skipReason: null, gateResults }
}