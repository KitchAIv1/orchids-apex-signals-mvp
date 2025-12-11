# 90-Day Validation Guide for ApexSignals

## Overview

This document outlines how ApexSignals will collect, measure, and improve during the 90-day validation period.

**Key Understanding**: GPT doesn't "learn" - it's stateless. The learning happens in YOUR SYSTEM by measuring GPT's outputs and adjusting weights/thresholds.

---

## What Gets Measured

### 1. Prediction Accuracy (Primary Metric)

| Checkpoint | Days | Purpose |
|------------|------|---------|
| 5-day | 5 trading days | Short-term momentum validation |
| **10-day** | 10 trading days | **PRIMARY** - Main accuracy metric |
| 20-day | 20 trading days | Trend confirmation |

**How It Works:**
- Each prediction stores `price_at_prediction`
- At checkpoint, system fetches current price
- Calculates `return_pct` and `direction` (UP/DOWN/FLAT)
- Compares to recommendation (BUY→UP, SELL→DOWN, HOLD→FLAT)
- Stores `directional_accuracy` (true/false)

### 2. Agent Performance

Each agent's accuracy is tracked independently:

| Agent | Weight | What It Evaluates |
|-------|--------|-------------------|
| Fundamental | 25% | P/E, ROE, margins, growth |
| Technical | 15% | RSI, MACD, moving averages |
| Sentiment | 15% | News, analyst ratings |
| Macro | 15% | Fed policy, inflation, GDP |
| Insider | 15% | Insider buying/selling patterns |
| Catalyst | 15% | Upcoming events, recent changes |

---

## Automated Processes

### Cron Schedule (vercel.json)

| Cron | Time (UTC) | Time (ET) | Purpose |
|------|------------|-----------|---------|
| Catalyst Monitor | 11:00, 15:00, 21:30, 03:00 | 6AM, 10AM, 4:30PM, 10PM | Detect and respond to catalysts |
| Weekly Analysis | 10:00 Sun | 5AM Sun | Refresh all stock analyses |
| **Daily Evaluation** | 23:00 Mon-Fri | 6PM Mon-Fri | Evaluate ready checkpoints |

### Daily Evaluation Process

The daily evaluation cron (`/api/cron/daily-evaluation`):
1. Fetches all predictions
2. Identifies checkpoints that are "ready" (enough days elapsed)
3. Fetches current price for each stock
4. Calculates return and directional accuracy
5. Updates `predictions` table with evaluation data
6. Calculates and stores agent performance metrics

---

## How Context Injection Works

### The Problem (Before)
- Catalyst agent only saw external API data (Finnhub, Yahoo)
- Recent events from `recommendation_history` were not passed to AI
- AI made decisions without knowing what recently happened

### The Solution (After)
- `AIAgentService.runAllAgents()` now fetches recent `recommendation_history`
- Builds `RecentHistoryContext` with:
  - Recent score changes
  - Positive/negative catalyst flags
  - Net score change
- Passes context to Catalyst agent via `formatDataForAgent()`

### Result
The Catalyst agent now sees prompts like:
```
=== CATALYST ANALYSIS ===

--- RECENT CATALYST-DRIVEN SCORE CHANGES (FROM OUR SYSTEM) ---
12/10/2024: iPhone 16 demand exceeds supply forecasts in China
  Score: 29.2 → 32 (↑2.8 pts)
  Recommendation: BUY → BUY
12/9/2024: Earnings beat expectations by 12%
  Score: 16.3 → 32 (↑15.7 pts)
  Recommendation: HOLD → BUY

Net Score Change (recent): +18.5 pts
⚡ POSITIVE CATALYST MOMENTUM detected

=== UPCOMING CATALYSTS ===
...
```

---

## Database Tables for Validation

### predictions
- `id`, `stock_id`, `recommendation`, `final_score`
- `price_at_prediction` - Captured at analysis time
- `evaluation_5d`, `evaluation_10d`, `evaluation_20d` - JSON with evaluation results
- `directional_accuracy` - Did prediction direction match actual?
- `return_pct` - Actual price change percentage

### agent_scores
- `stock_id`, `agent_name`, `score`, `weight`, `reasoning`
- Links to predictions for performance analysis

### agent_performance
- `agent_name`, `period_start`, `period_end`
- `total_predictions`, `correct_predictions`
- `accuracy_rate` - Percentage correct
- `avg_score` - Average score given

### recommendation_history
- Tracks all recommendation changes
- `previous_recommendation` → `new_recommendation`
- `previous_score` → `new_score`
- `change_reason` - Why the change happened

---

## Validation Milestones

### Week 1-4: Collection Phase
- [ ] Accumulate 100+ predictions
- [ ] Monitor API rate limits
- [ ] Verify catalyst detection is working
- [ ] Check evaluation cron is running

### Week 5-8: First Evaluations
- [ ] 5-day checkpoints start completing
- [ ] Review accuracy by agent
- [ ] Identify underperforming agents
- [ ] Note any patterns in errors

### Week 9-12: Adjustment Phase
- [ ] 10-day checkpoints complete
- [ ] Calculate agent accuracy rates
- [ ] Propose weight adjustments
- [ ] Consider threshold changes

---

## Manual Testing Commands

### Check Evaluation Status
```bash
curl http://localhost:3000/api/evaluate
```

### Trigger Manual Evaluation (all ready checkpoints)
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"autoEvaluate": true}'
```

### Check Agent Performance
```bash
curl http://localhost:3000/api/cron/daily-evaluation
```

### Trigger Single Stock Analysis
```bash
curl -X POST http://localhost:3000/api/analyze/AAPL
```

---

## Recommendation Engine Thresholds

Currently configured in `src/services/RecommendationEngine.ts`:

| Recommendation | Score Range |
|----------------|-------------|
| **BUY** | > 65 |
| **HOLD** | 35 to 65 |
| **SELL** | < 35 |

### Potential Adjustments Based on Data:
- If BUY signals often wrong: Lower threshold (e.g., 60 → 55)
- If SELL signals too conservative: Raise threshold (e.g., 35 → 40)
- If HOLD too wide: Narrow the range

---

## Agent Weight Adjustments

After 90 days, if data shows:
- Fundamental agent 80% accurate → Consider weight 25% → 30%
- Insider agent 40% accurate → Consider weight 15% → 10%

**Formula:**
```
New Weight = Old Weight × (Agent Accuracy / Average Accuracy)
```

---

## Key Metrics to Track

### Overall System
- Total predictions made
- Overall directional accuracy %
- Average return when following recommendations

### Per Agent
- Accuracy rate
- Average confidence when correct vs wrong
- Score variance (consistent vs wild swings)

### Per Stock
- Which stocks are most/least predictable
- Sector patterns

---

## Files Modified for 90-Day Validation

| File | Change |
|------|--------|
| `src/services/MarketDataService.ts` | Added `RecentHistoryContext`, `buildHistoryContext()`, updated `formatCatalystData()` |
| `src/services/AIAgentService.ts` | Added `fetchRecentHistory()`, passes context to catalyst agent |
| `src/app/api/cron/daily-evaluation/route.ts` | **NEW** - Automated evaluation cron |
| `vercel.json` | Added daily-evaluation cron schedule |
| `src/services/RecommendationEngine.ts` | Centralized thresholds (created earlier) |

---

## Success Criteria

After 90 days, ApexSignals should demonstrate:

1. **>60% directional accuracy** on 10-day predictions
2. **Clear agent performance data** showing which agents contribute most
3. **Documented adjustment recommendations** based on real data
4. **Working evaluation pipeline** with no manual intervention

---

## Next Steps After Validation

1. **Adjust agent weights** based on measured accuracy
2. **Tune thresholds** if recommendations don't match outcomes
3. **Add new data sources** if specific agents underperform
4. **Consider fine-tuning** prompts for low-accuracy agents
5. **Build performance dashboard** to visualize metrics

---

*Document created: December 11, 2025*
*For ApexSignals MVP 90-Day Validation Period*

