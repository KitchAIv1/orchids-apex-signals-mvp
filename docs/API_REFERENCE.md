# API Reference

Complete API documentation for Apex Signals.

## Authentication

API routes that handle cron jobs support optional bearer token authentication:

```
Authorization: Bearer <CRON_SECRET>
```

## Endpoints

---

### Analyze Stock

Triggers a full multi-agent analysis for a specific stock.

**Endpoint:** `POST /api/analyze/[ticker]`

**Parameters:**
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `ticker` | string | URL path | Stock ticker symbol (e.g., AAPL, MSFT) |

**Response:**
```json
{
  "success": true,
  "predictionId": "uuid",
  "recommendation": "BUY" | "HOLD" | "SELL",
  "score": 72.5,
  "agentResults": {
    "fundamental": { "score": 45, "reasoning": "..." },
    "technical": { "score": 62, "reasoning": "..." },
    "sentiment": { "score": 38, "reasoning": "..." },
    "macro": { "score": 55, "reasoning": "..." },
    "insider": { "score": 28, "reasoning": "..." },
    "catalyst": { "score": 70, "reasoning": "..." }
  },
  "synthesis": {
    "finalScore": 72.5,
    "recommendation": "BUY",
    "confidence": "HIGH",
    "holdingPeriod": "1-3 months",
    "debateSummary": "...",
    "riskFactors": ["..."],
    "urgency": "MEDIUM"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Stock INVALID not found"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze/AAPL
```

---

### Get Stock Price

Fetches the current stock price.

**Endpoint:** `GET /api/stock-price`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticker` | string | Yes | Stock ticker symbol |

**Response:**
```json
{
  "ticker": "AAPL",
  "price": 178.45,
  "change": 2.35,
  "changePercent": 1.34,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

**Example:**
```bash
curl "http://localhost:3000/api/stock-price?ticker=AAPL"
```

---

### Evaluate Predictions

Evaluates prediction accuracy at checkpoints (5-day, 10-day, 20-day).

**Endpoint:** `POST /api/evaluate`

**Request Body:**
```json
{
  "predictionId": "uuid",      // Optional: specific prediction
  "ticker": "AAPL",            // Optional: specific stock
  "checkpoint": "10d",         // Optional: specific checkpoint
  "evaluateAll": true          // Optional: evaluate all ready checkpoints
}
```

**Response:**
```json
{
  "evaluated": [
    {
      "predictionId": "uuid",
      "ticker": "AAPL",
      "checkpoint": "10d",
      "success": true,
      "evaluation": {
        "price": 182.50,
        "returnPct": 3.25,
        "direction": "UP",
        "directionalAccuracy": true,
        "evaluatedAt": "2024-01-25T00:00:00.000Z"
      }
    }
  ],
  "skipped": [],
  "errors": []
}
```

---

### Catalyst Monitor (Cron)

Processes recent catalyst events and triggers re-analysis when appropriate.

**Endpoint:** `POST /api/cron/catalyst-monitor`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>  (optional in production)
```

**Response:**
```json
{
  "message": "Catalyst monitoring completed. Reanalyzed 2, skipped 5 (saved ~$0.90)",
  "catalystsFound": 7,
  "processed": [
    {
      "ticker": "AAPL",
      "triggered": true,
      "skipReason": null,
      "gateResults": [
        { "gate": "Gate1_Urgency", "passed": true, "reason": "Urgency HIGH or CRITICAL" },
        { "gate": "Gate2_BoundaryProximity", "passed": true, "reason": "Score 68 near boundary (3 points)" }
      ]
    }
  ],
  "reanalyzed": ["AAPL", "MSFT"],
  "skipped": [
    { "ticker": "GOOGL", "reason": "Cooldown active (2.5h since last analysis)" }
  ],
  "failed": []
}
```

**GET Request (Status):**
```bash
curl http://localhost:3000/api/cron/catalyst-monitor
```

Returns current status and recent catalysts:
```json
{
  "message": "Catalyst monitor cron endpoint. Use POST to trigger.",
  "status": "ready",
  "gateSystem": "Multi-gate triggering enabled (5 gates)",
  "gates": [
    "Gate1: Urgency (HIGH/CRITICAL only)",
    "Gate2: Boundary Proximity (within 10 points)",
    "Gate3: Predicted Impact (must reach boundary)",
    "Gate4: Cooldown (6h min, 3/day max)",
    "Gate5: Confidence (high confidence resists weak catalysts)"
  ],
  "recentCatalysts": [...]
}
```

---

### Weekly Analysis (Cron)

Triggers weekly analysis for all active stocks.

**Endpoint:** `POST /api/cron/weekly-analysis`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>  (optional in production)
```

**Response:**
```json
{
  "success": true,
  "analyzed": 23,
  "results": [
    { "ticker": "AAPL", "success": true, "recommendation": "BUY" },
    { "ticker": "MSFT", "success": true, "recommendation": "HOLD" }
  ],
  "failed": []
}
```

---

## Data Types

### Recommendation
```typescript
type Recommendation = 'BUY' | 'HOLD' | 'SELL'
```

### Confidence
```typescript
type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'
```

### Urgency
```typescript
type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
```

### Direction
```typescript
type Direction = 'UP' | 'DOWN' | 'FLAT'
```

### Checkpoint
```typescript
type Checkpoint = '5d' | '10d' | '20d'
```

### Agent Names
```typescript
type AgentName = 'fundamental' | 'technical' | 'sentiment' | 'macro' | 'insider' | 'catalyst'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing auth token |
| 404 | Not Found - Stock or prediction not found |
| 500 | Internal Server Error - Processing error |

---

## Rate Limits

Rate limits depend on external API providers:

| Provider | Limit |
|----------|-------|
| Yahoo Finance (RapidAPI) | Varies by plan |
| Alpha Vantage | 5 calls/minute (free tier) |
| Finnhub | 60 calls/minute |
| FRED | 120 calls/minute |
| OpenAI | Varies by account |

The system implements caching to minimize API calls:

| Data Type | Cache Duration |
|-----------|---------------|
| Stock Quotes | 5 minutes |
| Technical Data | 15 minutes |
| News Sentiment | 30 minutes |
| Fundamentals | 1 hour |
| Insider Activity | 1 hour |
| Analyst Ratings | 24 hours |
| Macro Indicators | 4 hours |
