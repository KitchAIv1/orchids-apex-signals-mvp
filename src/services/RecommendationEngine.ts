/**
 * RecommendationEngine - Single Source of Truth for Scoring Logic
 * 
 * This service centralizes all recommendation threshold logic to ensure
 * consistency across the entire platform.
 */

export type Recommendation = 'BUY' | 'HOLD' | 'SELL'
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'
export type ScoreLabel = 'BULLISH' | 'NEUTRAL' | 'BEARISH'

/**
 * OFFICIAL RECOMMENDATION THRESHOLDS
 * Scale: -100 to +100 (agent consensus score)
 * All components MUST use these values
 * 
 * CALIBRATION v2 (2026-02-03):
 * - Lowered BUY threshold to capture market's natural upward bias
 * - Markets go UP ~63% of the time; system should reflect this
 * - HOLD now represents uncertainty, not flat expectation
 */
export const THRESHOLDS = {
  BUY_MIN: 0,       // Score > 0 = BUY (Bullish baseline - markets have upward bias)
  SELL_MAX: -25,    // Score < -25 = SELL (Only on strong bearish conviction)
  // HOLD = -25 to 0 (Uncertain/Cautious)
} as const

/**
 * SCORE COLOR THRESHOLDS (for UI consistency)
 * Aligned with new calibrated thresholds
 */
export const SCORE_COLORS = {
  BULLISH_MIN: 0,    // Green (score > 0) - aligned with BUY threshold
  BEARISH_MAX: -25,  // Red (score < -25) - aligned with SELL threshold
  // -25 to 0 = Amber/Cautious
} as const

/**
 * CATALYST TRIGGER BOUNDARIES
 * Used by 5-gate system to detect boundary proximity
 * Aligned with new calibrated thresholds
 */
export const CATALYST_BOUNDARIES = [-25, 0] as const

/**
 * Calculate recommendation from score using official thresholds
 */
export function calculateRecommendation(score: number): Recommendation {
  if (score > THRESHOLDS.BUY_MIN) return 'BUY'
  if (score < THRESHOLDS.SELL_MAX) return 'SELL'
  return 'HOLD'
}

/**
 * Get score label (BULLISH/NEUTRAL/BEARISH)
 * Scale: -100 to +100
 */
export function getScoreLabel(score: number): ScoreLabel {
  if (score > SCORE_COLORS.BULLISH_MIN) return 'BULLISH'
  if (score < SCORE_COLORS.BEARISH_MAX) return 'BEARISH'
  return 'NEUTRAL'
}

/**
 * Get score color class for UI
 * Scale: -100 to +100
 */
export function getScoreColorClass(score: number): string {
  if (score > SCORE_COLORS.BULLISH_MIN) return 'text-emerald-500'
  if (score < SCORE_COLORS.BEARISH_MAX) return 'text-rose-500'
  return 'text-amber-500'
}

/**
 * Get score background color class for UI
 * Scale: -100 to +100
 */
export function getScoreBgColorClass(score: number): string {
  if (score > SCORE_COLORS.BULLISH_MIN) return 'bg-emerald-500/10 border-emerald-500/30'
  if (score < SCORE_COLORS.BEARISH_MAX) return 'bg-rose-500/10 border-rose-500/30'
  return 'bg-amber-500/10 border-amber-500/30'
}

/**
 * Check if AI recommendation deviates from calculated
 */
export type RecommendationReconciliation = {
  aiRecommendation: Recommendation
  calculatedRecommendation: Recommendation
  score: number
  hasDeviation: boolean
  deviationSeverity: 'none' | 'minor' | 'major'
  explanation: string
}

export function reconcileRecommendation(
  score: number,
  aiRecommendation: Recommendation
): RecommendationReconciliation {
  const calculatedRecommendation = calculateRecommendation(score)
  const hasDeviation = aiRecommendation !== calculatedRecommendation

  let deviationSeverity: 'none' | 'minor' | 'major' = 'none'
  let explanation = ''

  if (hasDeviation) {
    // Major: opposite directions (BUY vs SELL)
    if (
      (aiRecommendation === 'BUY' && calculatedRecommendation === 'SELL') ||
      (aiRecommendation === 'SELL' && calculatedRecommendation === 'BUY')
    ) {
      deviationSeverity = 'major'
      explanation = `AI recommends ${aiRecommendation} but score ${score} indicates ${calculatedRecommendation}`
    } else {
      // Minor: adjacent (BUY↔HOLD or HOLD↔SELL)
      deviationSeverity = 'minor'
      explanation = `AI recommends ${aiRecommendation}, score ${score} suggests ${calculatedRecommendation}`
    }
  }

  return {
    aiRecommendation,
    calculatedRecommendation,
    score,
    hasDeviation,
    deviationSeverity,
    explanation
  }
}

/**
 * Calculate boundary proximity for catalyst triggers
 */
export function calculateBoundaryProximity(score: number): number {
  const distances = CATALYST_BOUNDARIES.map(b => Math.abs(score - b))
  return Math.min(...distances)
}

/**
 * Determine if score is near a boundary (for catalyst triggering)
 */
export function isNearBoundary(score: number, threshold: number = 10): boolean {
  return calculateBoundaryProximity(score) <= threshold
}

