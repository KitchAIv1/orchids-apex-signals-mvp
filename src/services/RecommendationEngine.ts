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
 */
export const THRESHOLDS = {
  BUY_MIN: 30,      // Score > +30 = BUY (Bullish)
  SELL_MAX: -30,    // Score < -30 = SELL (Bearish)
  // HOLD = -30 to +30 (Neutral)
} as const

/**
 * SCORE COLOR THRESHOLDS (for UI consistency)
 * Aligned with -100 to +100 scale
 */
export const SCORE_COLORS = {
  BULLISH_MIN: 30,   // Green (score > +30)
  BEARISH_MAX: -30,  // Red (score < -30)
  // -30 to +30 = Amber/Neutral
} as const

/**
 * CATALYST TRIGGER BOUNDARIES
 * Used by 5-gate system to detect boundary proximity
 * Updated for -100 to +100 scale
 */
export const CATALYST_BOUNDARIES = [-30, 30] as const

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

