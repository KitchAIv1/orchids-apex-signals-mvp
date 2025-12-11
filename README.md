# Apex Signals - AI-Powered Stock Analysis Platform

An advanced multi-agent AI stock analysis platform that provides transparent, data-driven investment insights across a curated portfolio of 23 stocks.

## Overview

Apex Signals leverages six specialized AI agents to analyze stocks from different perspectives, synthesizing their debates into actionable recommendations. The system provides complete transparency with prediction tracking and accuracy metrics.

## Features

- **Multi-Agent Analysis**: Six specialized AI agents analyze each stock
- **Real-Time Data Integration**: Live market data from multiple financial APIs
- **Catalyst Monitoring**: Automated detection and response to market events
- **Prediction Tracking**: Full history with checkpoint-based accuracy evaluation
- **Transparent Scoring**: Every recommendation includes detailed reasoning

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Data Sources**: Yahoo Finance, Finnhub, Alpha Vantage, FRED

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- API keys for data providers

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI
OPENAI_API_KEY=your_openai_key

# Market Data
YAHOO_FINANCE_API_KEY=your_rapidapi_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
FRED_API_KEY=your_fred_key

# Cron (optional, for production)
CRON_SECRET=your_cron_secret
```

## Architecture

### AI Agents

The system uses six specialized agents, each with weighted influence:

| Agent | Weight | Focus Area |
|-------|--------|------------|
| **Fundamental Analyst** | 25% | Revenue growth, margins, valuation, balance sheet |
| **Technical Analyst** | 15% | Moving averages, RSI, MACD, support/resistance |
| **Sentiment Analyst** | 15% | News sentiment, analyst ratings, social buzz |
| **Macro Economist** | 15% | Interest rates, economic indicators, sector cycles |
| **Insider Activity** | 15% | Insider buying/selling patterns, institutional changes |
| **Catalyst Hunter** | 15% | Upcoming earnings, FDA decisions, M&A potential |

### Scoring System

- Scores range from **-100** to **+100**
- Recommendations: **BUY** (>65), **HOLD** (35-65), **SELL** (<35)
- Confidence levels: LOW, MEDIUM, HIGH

### Database Schema

| Table | Purpose |
|-------|---------|
| `stocks` | Stock metadata (ticker, company name, sector) |
| `agent_scores` | Individual agent analysis results |
| `predictions` | Final synthesized recommendations |
| `catalyst_events` | Detected market catalysts |
| `recommendation_history` | Tracking recommendation changes |
| `stock_analysis_schedule` | Scheduling analysis runs |
| `agent_performance` | Agent accuracy tracking |
| `sentiment_history` | Historical sentiment data |

## API Routes

### `/api/analyze/[ticker]` - POST
Triggers full multi-agent analysis for a stock.

```bash
curl -X POST http://localhost:3000/api/analyze/AAPL
```

### `/api/evaluate` - POST
Evaluates prediction accuracy at checkpoints.

### `/api/stock-price` - GET
Fetches current stock price.

```bash
curl "http://localhost:3000/api/stock-price?ticker=AAPL"
```

### `/api/cron/catalyst-monitor` - POST
Processes catalyst events and triggers re-analysis when needed.

### `/api/cron/weekly-analysis` - POST
Runs scheduled weekly analysis for all stocks.

## Automated Monitoring

The catalyst monitor runs automatically on Vercel (4x daily):

| Time (EST) | Purpose |
|------------|---------|
| 6:00 AM | Pre-market preparation |
| 12:00 PM | Mid-day check |
| 6:00 PM | After-market close |
| 12:00 AM | Overnight news |

### Five-Gate Trigger System

Before triggering a re-analysis, catalysts pass through five gates:

1. **Urgency Gate**: Only HIGH/CRITICAL urgency catalysts proceed
2. **Boundary Proximity**: Score must be within 10 points of recommendation boundary
3. **Predicted Impact**: Catalyst must have enough impact to change recommendation
4. **Cooldown**: 6-hour minimum, max 3 re-analyses per day
5. **Confidence**: High-confidence predictions resist weak catalysts

## Prediction Evaluation

Predictions are evaluated at three checkpoints:

| Checkpoint | Days | Primary |
|------------|------|---------|
| 5-day | 5 | No |
| 10-day | 10 | Yes |
| 20-day | 20 | No |

Directional accuracy is calculated based on:
- **BUY** prediction correct if price goes UP (>0.5%)
- **SELL** prediction correct if price goes DOWN (<-0.5%)
- **HOLD** prediction correct if price stays FLAT (between -0.5% and +0.5%)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/[ticker]/    # Stock analysis endpoint
│   │   ├── cron/                # Automated jobs
│   │   ├── evaluate/            # Prediction evaluation
│   │   └── stock-price/         # Price lookup
│   ├── predictions/             # Prediction history page
│   ├── stock/[ticker]/          # Stock detail page
│   └── page.tsx                 # Dashboard
├── components/
│   ├── AgentDebate/             # Agent debate visualization
│   ├── Dashboard/               # Main dashboard components
│   ├── StockAnalysis/           # Stock detail components
│   ├── shared/                  # Shared components
│   └── ui/                      # UI primitives (shadcn/ui)
├── hooks/                       # Custom React hooks
├── lib/                         # Core utilities
├── services/                    # Business logic & API integrations
├── types/                       # TypeScript definitions
└── utils/                       # Helper functions
```

## Key Services

| Service | Responsibility |
|---------|---------------|
| `AIAgentService` | Runs agents, synthesizes debates, persists results |
| `MarketDataService` | Aggregates data from all financial APIs |
| `CatalystTriggerService` | Five-gate catalyst evaluation logic |
| `EvaluationService` | Checkpoint-based prediction evaluation |
| `YahooFinanceService` | Stock quotes, fundamentals, technical data |
| `FinnhubService` | News sentiment, insider activity, analyst ratings |
| `FREDService` | Macroeconomic indicators |

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables
3. Deploy

Cron jobs are configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/catalyst-monitor",
    "schedule": "0 5,11,17,23 * * *"
  }]
}
```

## Scripts

```bash
bun dev      # Start development server
bun build    # Build for production
bun start    # Start production server
bun lint     # Run ESLint
```

## License

Private - All rights reserved.
