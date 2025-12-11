# Deployment Guide

Step-by-step guide to deploying Apex Signals to production.

## Prerequisites

- GitHub account with repository access
- Vercel account (recommended) or other hosting platform
- Supabase project
- API keys for all data providers

## Environment Variables

Ensure all required environment variables are configured:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOi...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-xxx...` |
| `YAHOO_FINANCE_API_KEY` | RapidAPI Yahoo Finance key | `xxx...` |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key | `xxx...` |
| `FINNHUB_API_KEY` | Finnhub API key | `xxx...` |
| `FRED_API_KEY` | FRED API key | `xxx...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CRON_SECRET` | Secret for authenticating cron requests | (none) |

## Vercel Deployment (Recommended)

### 1. Connect Repository

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository

### 2. Configure Build Settings

Vercel auto-detects Next.js. Default settings work:

- **Framework Preset**: Next.js
- **Build Command**: `next build` (or `bun run build`)
- **Output Directory**: `.next`
- **Install Command**: `bun install` (or `npm install`)

### 3. Add Environment Variables

In Vercel project settings → Environment Variables:

1. Add each required variable
2. Set scope to "Production" and "Preview"
3. Click "Save"

### 4. Configure Cron Jobs

The `vercel.json` file configures cron jobs automatically:

```json
{
  "crons": [
    {
      "path": "/api/cron/catalyst-monitor",
      "schedule": "0 5,11,17,23 * * *"
    }
  ]
}
```

This runs the catalyst monitor at:
- 5:00 AM UTC (12:00 AM EST)
- 11:00 AM UTC (6:00 AM EST)
- 5:00 PM UTC (12:00 PM EST)
- 11:00 PM UTC (6:00 PM EST)

**Note**: Cron jobs require Vercel Pro plan ($20/month) or Team plan.

### 5. Deploy

Click "Deploy" and wait for the build to complete.

### 6. Verify Deployment

1. Check the deployment URL
2. Verify the dashboard loads
3. Test API endpoints:

```bash
# Test stock price endpoint
curl https://your-app.vercel.app/api/stock-price?ticker=AAPL

# Check catalyst monitor status
curl https://your-app.vercel.app/api/cron/catalyst-monitor
```

## Database Setup

### Initial Schema

If setting up a new Supabase project, run these migrations:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create stocks table
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  sector VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent_scores table
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

-- Create predictions table
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
  evaluation_5d JSONB,
  evaluation_10d JSONB,
  evaluation_20d JSONB,
  price_at_evaluation NUMERIC,
  return_pct NUMERIC,
  actual_direction VARCHAR(10),
  directional_accuracy BOOLEAN,
  evaluated_at TIMESTAMPTZ
);

-- Create catalyst_events table
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

-- Create recommendation_history table
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

-- Create stock_analysis_schedule table
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

-- Create agent_performance table
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

-- Create sentiment_history table
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

### Seed Stock Data

Add your curated stocks:

```sql
INSERT INTO stocks (ticker, company_name, sector) VALUES
  ('AAPL', 'Apple Inc.', 'Technology'),
  ('MSFT', 'Microsoft Corporation', 'Technology'),
  ('GOOGL', 'Alphabet Inc.', 'Technology'),
  ('AMZN', 'Amazon.com Inc.', 'Consumer Discretionary'),
  ('NVDA', 'NVIDIA Corporation', 'Technology'),
  ('META', 'Meta Platforms Inc.', 'Technology'),
  ('TSLA', 'Tesla Inc.', 'Consumer Discretionary'),
  ('JPM', 'JPMorgan Chase & Co.', 'Financials'),
  ('V', 'Visa Inc.', 'Financials'),
  ('JNJ', 'Johnson & Johnson', 'Healthcare'),
  ('UNH', 'UnitedHealth Group', 'Healthcare'),
  ('PG', 'Procter & Gamble', 'Consumer Staples'),
  ('HD', 'Home Depot Inc.', 'Consumer Discretionary'),
  ('MA', 'Mastercard Inc.', 'Financials'),
  ('DIS', 'Walt Disney Co.', 'Communication Services'),
  ('ADBE', 'Adobe Inc.', 'Technology'),
  ('CRM', 'Salesforce Inc.', 'Technology'),
  ('NFLX', 'Netflix Inc.', 'Communication Services'),
  ('AMD', 'Advanced Micro Devices', 'Technology'),
  ('INTC', 'Intel Corporation', 'Technology'),
  ('PEP', 'PepsiCo Inc.', 'Consumer Staples'),
  ('KO', 'Coca-Cola Co.', 'Consumer Staples'),
  ('WMT', 'Walmart Inc.', 'Consumer Staples');
```

## Manual Deployment (Other Platforms)

### Build

```bash
# Install dependencies
bun install

# Build for production
bun run build
```

### Environment

Set all environment variables on your hosting platform.

### Start

```bash
# Start production server
bun start
```

### Cron Jobs

Configure external cron service to call:

```bash
# Every 6 hours at 5, 11, 17, 23 UTC
curl -X POST https://your-app.com/api/cron/catalyst-monitor \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring

### Health Checks

- Dashboard should load at `/`
- API status at `/api/cron/catalyst-monitor` (GET)
- Stock price check: `/api/stock-price?ticker=AAPL`

### Logs

- Vercel: Project → Deployments → Functions tab
- Check for API errors and rate limiting issues

### Common Issues

| Issue | Solution |
|-------|----------|
| Cron not running | Verify Vercel Pro plan, check vercel.json |
| API rate limits | Check external API quotas |
| Analysis timeout | Increase `maxDuration` in route config |
| Database errors | Check Supabase connection string |

## Updating

### Automatic (Vercel)

Push to main branch triggers automatic deployment.

### Manual Rollback

In Vercel: Deployments → Select previous → "Promote to Production"

## Cost Considerations

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $20/mo Pro |
| Supabase | 500MB database | $25/mo Pro |
| OpenAI | Pay per use | ~$0.15-0.30 per analysis |
| Finnhub | 60 calls/min | Paid plans available |
| Alpha Vantage | 5 calls/min | $50/mo+ |
| FRED | Free | Free |

**Estimated monthly cost for 23 stocks, 4x daily analysis:**
- Vercel Pro: $20
- Supabase: $0-25
- OpenAI: ~$50-100
- **Total: $70-145/month**
