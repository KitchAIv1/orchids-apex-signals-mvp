/**
 * Script to add new stocks to the prediction system
 * Run with: npx tsx scripts/add-stocks.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const STOCKS_TO_ADD = [
  { ticker: 'ADT', company_name: 'ADT Inc.' },
  { ticker: 'SAN', company_name: 'Banco Santander S.A.' },
  { ticker: 'ARCO', company_name: 'Arcos Dorados Holdings Inc.' },
  { ticker: 'AIG', company_name: 'American International Group Inc.' },
  { ticker: 'HLO', company_name: 'Hireology, Inc.' },
  { ticker: 'COTY', company_name: 'Coty Inc.' },
  { ticker: 'CNG', company_name: 'CenterPoint Energy Resources' },
  { ticker: 'CAMP', company_name: 'CAMP4 Therapeutics Corporation' },
  { ticker: 'DSWL', company_name: 'Deswell Industries Inc.' },
  { ticker: 'MBRX', company_name: 'Moleculin Biotech Inc.' },
  { ticker: 'YALA', company_name: 'Yalla Group Limited' },
  { ticker: 'DGNX', company_name: 'Diagnos Inc.' },
]

async function addStocks() {
  console.log('Adding stocks to the prediction system...\n')

  for (const stock of STOCKS_TO_ADD) {
    // Check if stock already exists
    const { data: existing } = await supabase
      .from('stocks')
      .select('id, ticker')
      .eq('ticker', stock.ticker)
      .single()

    if (existing) {
      console.log(`✓ ${stock.ticker} already exists (ID: ${existing.id})`)
      continue
    }

    // Insert new stock
    const { data, error } = await supabase
      .from('stocks')
      .insert({
        ticker: stock.ticker,
        company_name: stock.company_name,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error(`✗ Failed to add ${stock.ticker}: ${error.message}`)
    } else {
      console.log(`✓ Added ${stock.ticker} - ${stock.company_name} (ID: ${data.id})`)
    }
  }

  console.log('\n✅ Done! Stocks are now available for analysis.')
  console.log('\nTo analyze a stock, run:')
  console.log('  curl -X POST http://localhost:3000/api/analyze/TICKER')
  console.log('\nOr wait for the weekly cron job to analyze all active stocks.')
}

addStocks().catch(console.error)

