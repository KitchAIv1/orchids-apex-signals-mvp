# Smart Re-Analysis System

> **Status:** Planned for End of December 2025  
> **Priority:** High  
> **Impact:** Cost reduction, accuracy improvement, faster execution

---

## Problem Statement

Currently, when a catalyst triggers re-analysis, **ALL 6 agents run again**. This is wasteful because:

1. **Fundamental data** only changes quarterly (earnings)
2. **Insider data** is aggregated monthly (MSPR)
3. **Macro data** updates monthly (Fed rates, GDP, CPI)

Re-running these agents when their underlying data hasn't changed:
- Wastes OpenAI API credits (~$0.03-0.05 per agent call)
- Adds unnecessary latency
- Can introduce noise if the AI interprets the same data slightly differently

---

## Proposed Solution: Conditional Agent Execution

### Agent Refresh Matrix

| Agent | Data Source | Refresh Frequency | Re-run Trigger |
|-------|-------------|-------------------|----------------|
| **Technical** | Yahoo Finance | Real-time | Always |
| **Sentiment** | Finnhub News/Analysts | Daily | Always |
| **Catalyst** | Finnhub Events | Event-driven | Always |
| **Fundamental** | Finnhub Financials | Quarterly | Earnings release detected |
| **Insider** | Finnhub Insider API | Monthly | New transactions in last 7 days |
| **Macro** | FRED API | Monthly | Data timestamp changed |

### Decision Logic

```
ON REANALYSIS TRIGGER:
  
  1. ALWAYS run:
     - Technical Agent (prices change constantly)
     - Sentiment Agent (news is dynamic)
     - Catalyst Agent (event-driven)
  
  2. CONDITIONALLY run Fundamental Agent IF:
     - Days since last earnings <= 7
     - OR no cached score exists
     - OR forced full refresh requested
  
  3. CONDITIONALLY run Insider Agent IF:
     - New insider transactions detected since last analysis
     - OR days since last run > 30
     - OR no cached score exists
  
  4. CONDITIONALLY run Macro Agent IF:
     - FRED data timestamp > last analysis timestamp
     - OR days since last run > 14
     - OR no cached score exists
```

---

## Implementation Plan

### Phase 1: Data Freshness Tracking

Create a new table or extend `agent_scores` to track data freshness:

```sql
-- Option A: New table
CREATE TABLE agent_data_freshness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID REFERENCES stocks(id),
  agent_name TEXT NOT NULL,
  last_data_timestamp TIMESTAMPTZ,  -- When source data was last updated
  last_run_timestamp TIMESTAMPTZ,   -- When agent last ran
  cached_score DECIMAL(5,2),
  cached_reasoning TEXT,
  cached_metrics JSONB,
  UNIQUE(stock_id, agent_name)
);

-- Option B: Extend agent_scores with freshness metadata
ALTER TABLE agent_scores ADD COLUMN data_timestamp TIMESTAMPTZ;
ALTER TABLE agent_scores ADD COLUMN is_cached BOOLEAN DEFAULT FALSE;
```

### Phase 2: Freshness Detection Functions

```typescript
// src/services/DataFreshnessService.ts

interface FreshnessCheck {
  agent: string
  shouldRerun: boolean
  reason: string
  cachedScore?: number
  cachedReasoning?: string
}

export async function checkAgentFreshness(
  ticker: string,
  agent: string
): Promise<FreshnessCheck> {
  
  switch (agent) {
    case 'fundamental':
      return checkFundamentalFreshness(ticker)
    case 'insider':
      return checkInsiderFreshness(ticker)
    case 'macro':
      return checkMacroFreshness(ticker)
    default:
      return { agent, shouldRerun: true, reason: 'Always refresh' }
  }
}

async function checkFundamentalFreshness(ticker: string): Promise<FreshnessCheck> {
  // 1. Get last earnings date from Finnhub
  // 2. Compare to last analysis timestamp
  // 3. If earnings happened since last analysis, shouldRerun = true
  // 4. Otherwise, return cached score
}

async function checkInsiderFreshness(ticker: string): Promise<FreshnessCheck> {
  // 1. Get latest insider transaction date from Finnhub
  // 2. Compare to last analysis timestamp
  // 3. If new transactions exist, shouldRerun = true
  // 4. Otherwise, return cached score
}

async function checkMacroFreshness(ticker: string): Promise<FreshnessCheck> {
  // 1. Get FRED data timestamps (Fed rate, GDP, CPI)
  // 2. Compare to last macro agent run
  // 3. If any data updated, shouldRerun = true
  // 4. Otherwise, return cached score
}
```

### Phase 3: Modify AIAgentService

Update `analyzeStock()` to use conditional execution:

```typescript
// In AIAgentService.ts

async function analyzeStock(ticker: string, options?: { 
  forceFull?: boolean  // Force all agents to run
}): Promise<AnalysisResult> {
  
  const freshnessChecks = await Promise.all([
    checkAgentFreshness(ticker, 'fundamental'),
    checkAgentFreshness(ticker, 'insider'),
    checkAgentFreshness(ticker, 'macro'),
  ])
  
  const agentsToRun: string[] = ['technical', 'sentiment', 'catalyst']
  const cachedScores: AgentScore[] = []
  
  for (const check of freshnessChecks) {
    if (options?.forceFull || check.shouldRerun) {
      agentsToRun.push(check.agent)
    } else {
      // Use cached score
      cachedScores.push({
        agent: check.agent,
        score: check.cachedScore!,
        reasoning: check.cachedReasoning + ' [CACHED]',
        // ...
      })
    }
  }
  
  // Run only necessary agents
  const freshScores = await runAgents(ticker, agentsToRun)
  
  // Merge fresh + cached
  const allScores = [...freshScores, ...cachedScores]
  
  // Calculate weighted final score
  return synthesize(allScores)
}
```

---

## Expected Savings

### Per Re-Analysis

| Scenario | Agents Run | Est. Cost | Latency |
|----------|-----------|-----------|---------|
| **Current (Full)** | 6 | ~$0.18 | ~8-12s |
| **Smart (Typical)** | 3-4 | ~$0.09-0.12 | ~4-6s |
| **Smart (Post-Earnings)** | 6 | ~$0.18 | ~8-12s |

### Monthly Projection (35 stocks, 4 re-analyses/month each)

| Approach | Total Calls | Est. Cost |
|----------|-------------|-----------|
| Current | 840 agent calls | ~$25.20 |
| Smart | ~500 agent calls | ~$15.00 |
| **Savings** | 340 calls | **~$10.20/month** |

---

## UI Considerations

### Show Cached vs Fresh Indicators

In the agent score display, indicate which scores are cached:

```
FUNDAMENTAL Agent: 25 [Cached - Next update after Q1 earnings]
TECHNICAL Agent: 55 [Fresh - Updated just now]
```

### Add "Force Full Refresh" Button

For stocks where user wants to override smart caching:

```
[🔄 Quick Refresh] - Runs 3 dynamic agents
[🔄 Full Refresh] - Runs all 6 agents (clears cache)
```

---

## Testing Checklist

- [ ] Verify cached scores are correctly retrieved
- [ ] Verify freshness detection triggers correctly after:
  - [ ] Earnings release
  - [ ] New insider transaction
  - [ ] FRED data update
- [ ] Verify weighted score calculation works with mixed fresh/cached
- [ ] Verify "[CACHED]" indicator shows in UI
- [ ] Verify "Force Full Refresh" overrides caching
- [ ] Compare scores: full refresh vs smart refresh (should be identical when data hasn't changed)

---

## Rollout Plan

1. **Week 1:** Implement `agent_data_freshness` table and tracking
2. **Week 2:** Implement freshness detection functions
3. **Week 3:** Modify AIAgentService for conditional execution
4. **Week 4:** Add UI indicators and "Force Full Refresh" button
5. **Week 5:** Testing and monitoring

---

## Future Enhancements

1. **Predictive Caching:** Pre-fetch data on known schedules (e.g., run macro agent day after FOMC)
2. **Partial Score Updates:** Only update the changed portion of final score
3. **Agent-Level Webhooks:** Subscribe to data source updates instead of polling

---

## Related Files

- `src/services/AIAgentService.ts` - Main analysis orchestration
- `src/services/MarketDataService.ts` - Data fetching
- `src/services/FinnhubService.ts` - Finnhub API calls
- `src/services/FredService.ts` - FRED macro data
- `src/app/api/cron/catalyst-monitor/route.ts` - Re-analysis trigger

---

*Document created: December 15, 2025*  
*Target implementation: End of December 2025*

