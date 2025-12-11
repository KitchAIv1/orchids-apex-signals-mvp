# Recommendation Engine - Scoring & Threshold Documentation

## Overview

This document describes the centralized recommendation engine that ensures consistency across the Apex Signals platform.

## Official Thresholds (Single Source of Truth)

All thresholds are defined in `src/services/RecommendationEngine.ts`:

| Score Range | Recommendation | Label | Color |
|-------------|----------------|-------|-------|
| > 65 | **BUY** | BULLISH | Emerald (Green) |
| 35 - 65 | **HOLD** | NEUTRAL | Amber (Yellow) |
| < 35 | **SELL** | BEARISH | Rose (Red) |

```typescript
export const THRESHOLDS = {
  BUY_MIN: 65,      // Score > 65 = BUY
  SELL_MAX: 35,     // Score < 35 = SELL
  // HOLD = 35-65 (inclusive)
}
```

## How Scoring Works

### 1. Agent Scores
Each of the 6 AI agents provides a score from -100 to +100:

| Agent | Weight | Focus |
|-------|--------|-------|
| Fundamental | 25% | Financial health, valuation |
| Technical | 15% | Price patterns, momentum |
| Sentiment | 15% | News, analyst ratings |
| Macro | 15% | Economic conditions |
| Insider | 15% | Insider transactions |
| Catalyst | 15% | Upcoming events |

### 2. Weighted Calculation
```
Final Score = Σ (Agent Score × Agent Weight)
```

Example:
- Fundamental: 25 × 0.25 = 6.25
- Technical: 45 × 0.15 = 6.75
- Sentiment: 75 × 0.15 = 11.25
- Macro: 30 × 0.15 = 4.5
- Insider: -80 × 0.15 = -12.0
- Catalyst: 75 × 0.15 = 11.25
- **Total: 28**

### 3. Recommendation Mapping
- Score 28 → **SELL** (28 < 35)

## AI Recommendation Reconciliation

### The Hybrid Approach

The system uses a **hybrid approach** that balances AI judgment with threshold consistency:

1. **AI provides its recommendation** during synthesis
2. **System calculates expected recommendation** from score
3. **Deviation is flagged** when they differ

### Deviation Handling

```typescript
type RecommendationReconciliation = {
  aiRecommendation: Recommendation
  calculatedRecommendation: Recommendation
  score: number
  hasDeviation: boolean
  deviationSeverity: 'none' | 'minor' | 'major'
  explanation: string
}
```

| Deviation Type | Example | Severity |
|----------------|---------|----------|
| None | AI=HOLD, Calculated=HOLD | none |
| Minor | AI=HOLD, Calculated=SELL | minor |
| Major | AI=BUY, Calculated=SELL | major |

### Why Allow AI Deviations?

AI may deviate when qualitative factors override quantitative score:
- Imminent positive catalyst (earnings, FDA approval)
- Temporary technical weakness in fundamentally strong stock
- Market conditions not captured by score

### How Deviations Are Surfaced

1. **Console Warning** (logged for monitoring):
   ```
   ⚠️ Recommendation Deviation for GOOGL:
   AI=HOLD, Calculated=SELL, Score=28, Severity=minor
   ```

2. **UI Indicator** (visible to users):
   - Yellow warning badge below recommendation
   - Text: "Score suggests SELL"
   - Tooltip with full explanation

## Catalyst Trigger Boundaries

The catalyst monitoring system uses the same boundaries for detecting when scores approach recommendation change points:

```typescript
export const CATALYST_BOUNDARIES = [35, 65]
```

A catalyst will only trigger re-analysis if:
- Score is within 10 points of a boundary (25-45 or 55-75)
- Catalyst urgency is HIGH or CRITICAL
- Cooldown period has passed

## Files Using This System

| File | Purpose |
|------|---------|
| `src/services/RecommendationEngine.ts` | Single source of truth |
| `src/services/AgentService.ts` | Uses engine for calculations |
| `src/services/AIAgentService.ts` | Reconciles AI vs calculated |
| `src/services/CatalystTriggerService.ts` | Uses boundaries for triggers |
| `src/utils/formatters.ts` | Uses engine for colors |
| `src/components/AgentDebate/DebateSummary.tsx` | Shows deviation flag |

## Testing Recommendations

### Verify Threshold Consistency
```bash
# All these should return the same thresholds
grep -r "THRESHOLDS" src/services/
```

### Check for Deviations in Logs
```bash
# Watch for deviation warnings in dev server
grep "Recommendation Deviation" .next/server/*.log
```

### Manual Verification
1. Run analysis on a stock
2. Check if score matches recommendation per thresholds
3. If deviation exists, verify UI shows warning

## Changelog

| Date | Change |
|------|--------|
| 2025-12-11 | Created centralized RecommendationEngine |
| 2025-12-11 | Standardized thresholds to 65/35 |
| 2025-12-11 | Added AI deviation detection & UI flag |
| 2025-12-11 | Updated all components to use engine |

