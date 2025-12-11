# Database Schema

Complete database schema documentation for Apex Signals.

## Overview

The database is hosted on Supabase (PostgreSQL) and consists of 8 tables that track stocks, AI analysis results, predictions, and historical data.

## Tables

### stocks

Core table containing the curated list of stocks being analyzed.

```sql
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  sector VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticker | VARCHAR(10) | Stock symbol (e.g., AAPL) |
| company_name | VARCHAR(255) | Full company name |
| sector | VARCHAR(100) | Industry sector |
| is_active | BOOLEAN | Whether stock is actively monitored |
| created_at | TIMESTAMPTZ | Record creation timestamp |

---

### agent_scores

Stores individual AI agent analysis results for each stock.

```sql
CREATE TABLE agent_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  agent_name VARCHAR(50) NOT NULL,
  score NUMERIC NOT NULL,
  weight NUMERIC DEFAULT 0.15,
  reasoning TEXT,
  key_metrics JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_id | UUID | Foreign key to stocks |
| agent_name | VARCHAR(50) | Agent identifier (fundamental, technical, etc.) |
| score | NUMERIC | Agent's score (-100 to +100) |
| weight | NUMERIC | Agent's voting weight (0.15-0.25) |
| reasoning | TEXT | AI-generated explanation |
| key_metrics | JSONB | Key data points used |
| timestamp | TIMESTAMPTZ | Analysis timestamp |

**key_metrics example:**
```json
{
  "metric_1": "P/E Ratio: 28.5",
  "metric_2": "Revenue Growth: 12.3%",
  "metric_3": "Debt/Equity: 1.2"
}
```

---

### predictions

Final synthesized recommendations from the agent debate.

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  final_score NUMERIC NOT NULL,
  recommendation VARCHAR(10) NOT NULL,
  confidence VARCHAR(10) NOT NULL,
  holding_period VARCHAR(50),
  debate_summary TEXT,
  risk_factors TEXT[],
  predicted_at TIMESTAMPTZ DEFAULT now(),
  price_at_prediction NUMERIC,
  
  -- Checkpoint evaluations (JSONB)
  evaluation_5d JSONB,
  evaluation_10d JSONB,
  evaluation_20d JSONB,
  
  -- Legacy evaluation fields (10-day primary)
  price_at_evaluation NUMERIC,
  return_pct NUMERIC,
  actual_direction VARCHAR(10),
  directional_accuracy BOOLEAN,
  evaluated_at TIMESTAMPTZ
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_id | UUID | Foreign key to stocks |
| final_score | NUMERIC | Weighted consensus score (-100 to +100) |
| recommendation | VARCHAR(10) | BUY, HOLD, or SELL |
| confidence | VARCHAR(10) | LOW, MEDIUM, or HIGH |
| holding_period | VARCHAR(50) | Suggested holding period |
| debate_summary | TEXT | Synthesis of agent debate |
| risk_factors | TEXT[] | Array of identified risks |
| predicted_at | TIMESTAMPTZ | Prediction timestamp |
| price_at_prediction | NUMERIC | Stock price when predicted |
| evaluation_5d | JSONB | 5-day checkpoint evaluation |
| evaluation_10d | JSONB | 10-day checkpoint evaluation (primary) |
| evaluation_20d | JSONB | 20-day checkpoint evaluation |
| price_at_evaluation | NUMERIC | Price at primary evaluation |
| return_pct | NUMERIC | Return percentage at evaluation |
| actual_direction | VARCHAR(10) | UP, DOWN, or FLAT |
| directional_accuracy | BOOLEAN | Whether prediction was correct |
| evaluated_at | TIMESTAMPTZ | When evaluation occurred |

**evaluation_Xd structure:**
```json
{
  "price": 182.50,
  "returnPct": 3.25,
  "direction": "UP",
  "directionalAccuracy": true,
  "evaluatedAt": "2024-01-25T00:00:00.000Z"
}
```

---

### catalyst_events

Market events that may trigger re-analysis.

```sql
CREATE TABLE catalyst_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  urgency VARCHAR(20) NOT NULL,
  description TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  impact_on_score NUMERIC,
  triggered_reanalysis BOOLEAN,
  skip_reason TEXT,
  source_url TEXT
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_id | UUID | Foreign key to stocks |
| event_type | VARCHAR(100) | Type of catalyst event |
| urgency | VARCHAR(20) | LOW, MEDIUM, HIGH, or CRITICAL |
| description | TEXT | Event description |
| detected_at | TIMESTAMPTZ | When event was detected |
| impact_on_score | NUMERIC | Estimated score impact |
| triggered_reanalysis | BOOLEAN | Whether it triggered re-analysis |
| skip_reason | TEXT | Reason if skipped |
| source_url | TEXT | Source of the catalyst |

**Event types:**
- `earnings_beat` / `earnings_miss`
- `fda_approval` / `fda_rejection`
- `contract_win` / `contract_loss`
- `analyst_upgrade` / `analyst_downgrade`
- `insider_buying` / `insider_selling`
- `price_spike_up` / `price_spike_down`
- `general_positive_news` / `general_negative_news`
- `leadership_change`
- `AI_ANALYSIS`

---

### recommendation_history

Tracks changes in recommendations over time.

```sql
CREATE TABLE recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  previous_recommendation VARCHAR(10),
  new_recommendation VARCHAR(10) NOT NULL,
  previous_score NUMERIC,
  new_score NUMERIC NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_id | UUID | Foreign key to stocks |
| previous_recommendation | VARCHAR(10) | Previous recommendation |
| new_recommendation | VARCHAR(10) | New recommendation |
| previous_score | NUMERIC | Previous score |
| new_score | NUMERIC | New score |
| change_reason | TEXT | Why recommendation changed |
| changed_at | TIMESTAMPTZ | When change occurred |

---

### stock_analysis_schedule

Manages scheduled analysis runs.

```sql
CREATE TABLE stock_analysis_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol VARCHAR(10) NOT NULL,
  last_analyzed TIMESTAMPTZ,
  next_analysis TIMESTAMPTZ,
  analysis_frequency VARCHAR(50) DEFAULT 'weekly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  stock_id UUID REFERENCES stocks(id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_symbol | VARCHAR(10) | Stock ticker |
| last_analyzed | TIMESTAMPTZ | Last analysis time |
| next_analysis | TIMESTAMPTZ | Scheduled next analysis |
| analysis_frequency | VARCHAR(50) | Frequency (weekly, daily, etc.) |
| is_active | BOOLEAN | Whether schedule is active |
| created_at | TIMESTAMPTZ | Record creation time |
| stock_id | UUID | Foreign key to stocks |

---

### agent_performance

Tracks accuracy metrics for each AI agent.

```sql
CREATE TABLE agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate NUMERIC,
  avg_score NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_name | VARCHAR(50) | Agent identifier |
| period_start | TIMESTAMPTZ | Evaluation period start |
| period_end | TIMESTAMPTZ | Evaluation period end |
| total_predictions | INTEGER | Total predictions in period |
| correct_predictions | INTEGER | Correct predictions count |
| accuracy_rate | NUMERIC | Accuracy percentage |
| avg_score | NUMERIC | Average score given |
| calculated_at | TIMESTAMPTZ | When metrics calculated |

---

### sentiment_history

Historical sentiment data for trend analysis.

```sql
CREATE TABLE sentiment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  sentiment_score NUMERIC NOT NULL,
  article_count INTEGER DEFAULT 0,
  key_topics TEXT[],
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stock_id | UUID | Foreign key to stocks |
| source | VARCHAR(100) | Data source (Finnhub, etc.) |
| sentiment_score | NUMERIC | Sentiment score |
| article_count | INTEGER | Number of articles analyzed |
| key_topics | TEXT[] | Main topics identified |
| recorded_at | TIMESTAMPTZ | When recorded |

---

## Indexes

Recommended indexes for optimal query performance:

```sql
-- Stock lookups
CREATE INDEX idx_stocks_ticker ON stocks(ticker);
CREATE INDEX idx_stocks_active ON stocks(is_active);

-- Agent scores
CREATE INDEX idx_agent_scores_stock ON agent_scores(stock_id);
CREATE INDEX idx_agent_scores_timestamp ON agent_scores(timestamp);
CREATE INDEX idx_agent_scores_agent ON agent_scores(agent_name);

-- Predictions
CREATE INDEX idx_predictions_stock ON predictions(stock_id);
CREATE INDEX idx_predictions_time ON predictions(predicted_at);
CREATE INDEX idx_predictions_recommendation ON predictions(recommendation);
CREATE INDEX idx_predictions_evaluated ON predictions(evaluated_at);

-- Catalyst events
CREATE INDEX idx_catalyst_stock ON catalyst_events(stock_id);
CREATE INDEX idx_catalyst_detected ON catalyst_events(detected_at);
CREATE INDEX idx_catalyst_urgency ON catalyst_events(urgency);
CREATE INDEX idx_catalyst_triggered ON catalyst_events(triggered_reanalysis);

-- Recommendation history
CREATE INDEX idx_rec_history_stock ON recommendation_history(stock_id);
CREATE INDEX idx_rec_history_changed ON recommendation_history(changed_at);
```

---

## Common Queries

### Get latest prediction for a stock
```sql
SELECT p.*, s.ticker, s.company_name
FROM predictions p
JOIN stocks s ON p.stock_id = s.id
WHERE s.ticker = 'AAPL'
ORDER BY p.predicted_at DESC
LIMIT 1;
```

### Get all agent scores for latest analysis
```sql
SELECT a.*
FROM agent_scores a
WHERE a.stock_id = 'stock-uuid'
ORDER BY a.timestamp DESC
LIMIT 6;
```

### Get predictions ready for evaluation
```sql
SELECT p.*, s.ticker
FROM predictions p
JOIN stocks s ON p.stock_id = s.id
WHERE p.evaluated_at IS NULL
  AND p.predicted_at < now() - INTERVAL '10 days'
ORDER BY p.predicted_at ASC;
```

### Get recent high-urgency catalysts
```sql
SELECT c.*, s.ticker
FROM catalyst_events c
JOIN stocks s ON c.stock_id = s.id
WHERE c.urgency IN ('HIGH', 'CRITICAL')
  AND c.detected_at > now() - INTERVAL '24 hours'
ORDER BY c.detected_at DESC;
```

### Calculate overall accuracy
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE directional_accuracy = true) as correct,
  ROUND(
    COUNT(*) FILTER (WHERE directional_accuracy = true)::numeric / 
    COUNT(*)::numeric * 100, 2
  ) as accuracy_pct
FROM predictions
WHERE evaluated_at IS NOT NULL;
```
