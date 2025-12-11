# System Architecture

Technical architecture documentation for Apex Signals.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard  │  Stock Detail  │  Prediction History  │  Agent Debates    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API Layer (Next.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/analyze  │  /api/evaluate  │  /api/stock-price  │  /api/cron/*    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│   AI Agent Service  │  │  Market Data    │  │   Supabase Database     │
│   (OpenAI GPT-4o)   │  │  Aggregator     │  │   (PostgreSQL)          │
└─────────────────────┘  └────────┬────────┘  └─────────────────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
     │ Yahoo   │ │ Finnhub │ │ Alpha   │ │  FRED   │ │ Direct  │
     │ Finance │ │         │ │ Vantage │ │         │ │ Yahoo   │
     └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Component Architecture

### Frontend Components

```
components/
├── AgentDebate/
│   ├── AgentCard.tsx           # Individual agent display
│   ├── AgentDebateRoom.tsx     # Full debate visualization
│   ├── AgentReasoningPanel.tsx # Detailed agent reasoning
│   └── DebateSummary.tsx       # Synthesized debate summary
│
├── Dashboard/
│   ├── FilterBar.tsx           # Stock filtering controls
│   ├── RecommendationBadge.tsx # BUY/HOLD/SELL badge
│   ├── ScoreBadge.tsx          # Score visualization
│   ├── StockCard.tsx           # Stock card component
│   └── StockList.tsx           # Main stock grid
│
├── StockAnalysis/
│   ├── RiskFactorsList.tsx     # Risk factor display
│   ├── StockDetailClient.tsx   # Client-side stock page
│   └── StockOverview.tsx       # Stock overview panel
│
└── shared/
    ├── AccuracyMetrics.tsx     # Prediction accuracy stats
    ├── CatalystBadge.tsx       # Catalyst urgency badge
    ├── CatalystTimeline.tsx    # Event timeline
    ├── CheckpointProgress.tsx  # Evaluation checkpoint UI
    ├── ConfidenceBar.tsx       # Confidence visualization
    ├── DisclaimerBanner.tsx    # Legal disclaimer
    ├── LivePriceDisplay.tsx    # Real-time price
    ├── Navbar.tsx              # Navigation bar
    ├── PredictionCard.tsx      # Prediction display
    ├── PredictionHistory.tsx   # Full prediction list
    └── ScoreRing.tsx           # Circular score display
```

### Service Layer

```
services/
├── AIAgentService.ts          # Core AI analysis orchestration
├── CatalystTriggerService.ts  # Five-gate trigger logic
├── EvaluationService.ts       # Checkpoint evaluation
├── MarketDataService.ts       # Data aggregation & caching
├── FinnhubService.ts          # News, insiders, analysts
├── FREDService.ts             # Macro economic data
├── YahooFinanceService.ts     # Quotes, technicals
├── RecommendationHistoryService.ts  # Recommendation tracking
└── StockAnalysisService.ts    # Stock analysis utilities
```

## Data Flow

### Analysis Flow

```
1. Trigger Analysis (API/Cron)
         │
         ▼
2. Fetch Market Data (parallel)
   ├── Yahoo Finance → Quote, Technicals
   ├── Finnhub → News, Insiders, Analysts
   ├── Alpha Vantage → Fundamentals
   └── FRED → Macro Indicators
         │
         ▼
3. Run 6 AI Agents (parallel)
   ├── Fundamental Agent
   ├── Technical Agent
   ├── Sentiment Agent
   ├── Macro Agent
   ├── Insider Agent
   └── Catalyst Agent
         │
         ▼
4. Synthesize Debate
   └── GPT-4o weighs all opinions
         │
         ▼
5. Persist Results
   ├── agent_scores table
   ├── predictions table
   └── catalyst_events table (if high urgency)
```

### Catalyst Trigger Flow

```
1. Catalyst Event Detected
         │
         ▼
2. Gate 1: Urgency Check
   └── Must be HIGH or CRITICAL
         │
         ▼
3. Gate 2: Boundary Proximity
   └── Score within 10 points of boundary
         │
         ▼
4. Gate 3: Predicted Impact
   └── Impact sufficient to change recommendation
         │
         ▼
5. Gate 4: Cooldown Check
   └── 6h minimum, max 3/day
         │
         ▼
6. Gate 5: Confidence Check
   └── High confidence resists weak catalysts
         │
         ▼
7. Trigger Re-Analysis or Skip
```

### Evaluation Flow

```
1. Check Prediction Age
         │
         ▼
2. Determine Ready Checkpoints
   ├── 5-day (after 5 trading days)
   ├── 10-day (after 10 trading days) ← Primary
   └── 20-day (after 20 trading days)
         │
         ▼
3. Fetch Current Price
         │
         ▼
4. Calculate Returns
   └── returnPct = (current - predicted) / predicted * 100
         │
         ▼
5. Determine Direction
   ├── UP if returnPct > 0.5%
   ├── DOWN if returnPct < -0.5%
   └── FLAT otherwise
         │
         ▼
6. Calculate Directional Accuracy
   ├── BUY correct if UP
   ├── SELL correct if DOWN
   └── HOLD correct if FLAT
         │
         ▼
7. Persist Evaluation
```

## Database Schema

### Entity Relationship

```
stocks
├── id (PK)
├── ticker
├── company_name
├── sector
├── is_active
└── created_at
     │
     ├──────────────────────────────────────────────────────────┐
     │                                                          │
     ▼                                                          ▼
agent_scores                                              predictions
├── id (PK)                                              ├── id (PK)
├── stock_id (FK)                                        ├── stock_id (FK)
├── agent_name                                           ├── final_score
├── score                                                ├── recommendation
├── weight                                               ├── confidence
├── reasoning                                            ├── holding_period
├── key_metrics                                          ├── debate_summary
└── timestamp                                            ├── risk_factors
                                                         ├── predicted_at
     │                                                   ├── price_at_prediction
     │                                                   ├── evaluation_5d
     ▼                                                   ├── evaluation_10d
catalyst_events                                          ├── evaluation_20d
├── id (PK)                                              ├── actual_direction
├── stock_id (FK)                                        ├── directional_accuracy
├── event_type                                           └── evaluated_at
├── urgency
├── description
├── detected_at
├── impact_on_score
├── triggered_reanalysis
├── skip_reason
└── source_url

recommendation_history
├── id (PK)
├── stock_id (FK)
├── previous_recommendation
├── new_recommendation
├── previous_score
├── new_score
├── change_reason
└── changed_at
```

## Caching Strategy

```typescript
const CACHE_DURATIONS = {
  quote: 5 * 60 * 1000,        // 5 minutes
  fundamentals: 60 * 60 * 1000, // 1 hour
  technical: 15 * 60 * 1000,    // 15 minutes
  news: 30 * 60 * 1000,         // 30 minutes
  insider: 60 * 60 * 1000,      // 1 hour
  macro: 4 * 60 * 60 * 1000,    // 4 hours
  analyst: 24 * 60 * 60 * 1000, // 24 hours
  earnings: 24 * 60 * 60 * 1000 // 24 hours
}
```

In-memory cache with key format: `{type}:{ticker}`

## AI Agent Configuration

```typescript
const AGENT_CONFIGS = {
  fundamental: { weight: 0.25 },  // Highest weight
  technical: { weight: 0.15 },
  sentiment: { weight: 0.15 },
  macro: { weight: 0.15 },
  insider: { weight: 0.15 },
  catalyst: { weight: 0.15 }
}

// Scoring boundaries (defined in src/services/RecommendationEngine.ts)
const THRESHOLDS = {
  BUY_MIN: 65,   // Score > 65 = BUY
  SELL_MAX: 35   // Score < 35 = SELL
  // 35-65 = HOLD
}
```

## AI Recommendation Reconciliation

The system uses a hybrid approach for recommendations:

1. **AI provides its recommendation** during debate synthesis
2. **System calculates expected recommendation** from the final score
3. **Deviations are flagged** when AI disagrees with calculated

This preserves AI's qualitative judgment while maintaining transparency:
- UI shows warning when AI deviates from calculated recommendation
- Logs capture all deviations for monitoring
- Severity: minor (adjacent) vs major (opposite)

See `docs/RECOMMENDATION_ENGINE.md` for full details.

## External API Integration

### Yahoo Finance

- **Endpoint**: `query1.finance.yahoo.com` (direct) or RapidAPI
- **Data**: Quotes, historical prices, basic fundamentals
- **Fallback**: RapidAPI if direct fails

### Alpha Vantage

- **Endpoint**: `alphavantage.co/query`
- **Data**: Detailed fundamentals, company overview
- **Rate Limit**: 5 calls/minute (free tier)

### Finnhub

- **Endpoint**: `finnhub.io/api/v1`
- **Data**: News sentiment, insider transactions, analyst ratings, earnings calendar
- **Rate Limit**: 60 calls/minute

### FRED (Federal Reserve)

- **Endpoint**: `api.stlouisfed.org/fred`
- **Data**: Fed funds rate, treasury yields, unemployment, CPI, GDP, VIX
- **Rate Limit**: 120 calls/minute

## Error Handling

### Graceful Degradation

```typescript
// Market data fetch with fallback
async function getStockMarketData(ticker: string) {
  const errors: string[] = []
  
  // Each data source is fetched independently
  // Failures are logged but don't block other data
  await Promise.all([
    getQuote().catch(e => errors.push(`Quote: ${e.message}`)),
    getFundamentals().catch(e => errors.push(`Fundamentals: ${e.message}`)),
    // ... other sources
  ])
  
  return { data, errors }  // Partial data with error list
}
```

### AI Agent Fallback

- Agents receive live data when available
- Fall back to training data knowledge with explicit disclaimer
- Never block analysis due to missing data

## Security Considerations

- API keys stored in environment variables
- No secrets logged or exposed to frontend
- Optional bearer token auth for cron endpoints
- Supabase RLS disabled for simplicity (internal tool)
- Input validation on all API endpoints

## Performance Optimizations

1. **Parallel Execution**: All 6 agents run simultaneously
2. **Aggressive Caching**: Market data cached at appropriate intervals
3. **Turbopack**: Fast development builds with Next.js Turbopack
4. **React Server Components**: Minimized client-side JavaScript
5. **Database Queries**: Optimized with proper indexes
