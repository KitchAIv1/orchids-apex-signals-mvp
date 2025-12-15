/**
 * CatalystDetectionService
 * 
 * Automatically detects market catalysts from news, earnings, and analyst actions.
 * Inserts qualified events into catalyst_events table for processing.
 */

import { supabase } from '@/lib/supabase'
import { getCompanyNews, getUpgrades, type NewsArticle } from './FinnhubService'

type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type DetectedCatalyst = {
  stockId: string
  ticker: string
  eventType: string
  urgency: UrgencyLevel
  description: string
  sourceUrl: string | null
  impactScore: number
}

type DetectionResult = {
  stocksScanned: number
  catalystsDetected: number
  catalystsInserted: number
  duplicatesSkipped: number
  errors: string[]
  detectedEvents: DetectedCatalyst[]
}

// Keywords for catalyst classification
const CATALYST_PATTERNS = {
  earnings: {
    keywords: ['earnings', 'quarterly results', 'q1', 'q2', 'q3', 'q4', 'eps', 'revenue beat', 'revenue miss'],
    baseUrgency: 'HIGH' as UrgencyLevel
  },
  analyst: {
    keywords: ['upgrade', 'downgrade', 'price target', 'rating', 'analyst'],
    baseUrgency: 'MEDIUM' as UrgencyLevel
  },
  fda: {
    keywords: ['fda', 'approval', 'drug', 'clinical trial', 'phase'],
    baseUrgency: 'CRITICAL' as UrgencyLevel
  },
  merger: {
    keywords: ['merger', 'acquisition', 'buyout', 'takeover', 'm&a'],
    baseUrgency: 'CRITICAL' as UrgencyLevel
  },
  leadership: {
    keywords: ['ceo', 'cfo', 'executive', 'resign', 'appoint', 'leadership'],
    baseUrgency: 'MEDIUM' as UrgencyLevel
  },
  legal: {
    keywords: ['lawsuit', 'investigation', 'sec', 'doj', 'fraud', 'settlement'],
    baseUrgency: 'HIGH' as UrgencyLevel
  },
  product: {
    keywords: ['launch', 'new product', 'release', 'recall', 'partnership'],
    baseUrgency: 'MEDIUM' as UrgencyLevel
  }
}

/**
 * Classify a news article into a catalyst type and urgency
 */
function classifyCatalyst(article: NewsArticle): {
  eventType: string
  urgency: UrgencyLevel
  impactScore: number
} | null {
  const text = `${article.headline} ${article.summary}`.toLowerCase()
  
  // Check each pattern category
  for (const [category, config] of Object.entries(CATALYST_PATTERNS)) {
    const matchCount = config.keywords.filter(kw => text.includes(kw)).length
    
    if (matchCount >= 1) {
      // Adjust urgency based on sentiment and match count
      let urgency = config.baseUrgency
      let impactScore = matchCount * 10
      
      // Boost urgency for strong sentiment
      if (article.sentiment === 'positive') {
        impactScore += 15
      } else if (article.sentiment === 'negative') {
        impactScore += 20 // Negative news often more impactful
        if (urgency === 'MEDIUM') urgency = 'HIGH'
      }
      
      // Multiple keyword matches increase urgency
      if (matchCount >= 3 && urgency === 'MEDIUM') {
        urgency = 'HIGH'
      }
      
      return {
        eventType: mapCategoryToEventType(category, article.sentiment),
        urgency,
        impactScore: Math.min(impactScore, 50)
      }
    }
  }
  
  // Check for general significant news based on sentiment
  if (article.sentiment === 'positive') {
    return {
      eventType: 'general_positive_news',
      urgency: 'LOW',
      impactScore: 10
    }
  } else if (article.sentiment === 'negative') {
    return {
      eventType: 'general_negative_news',
      urgency: 'MEDIUM',
      impactScore: 15
    }
  }
  
  return null // Not significant enough
}

/**
 * Map category to specific event type
 */
function mapCategoryToEventType(
  category: string, 
  sentiment: 'positive' | 'negative' | 'neutral'
): string {
  const typeMap: Record<string, { positive: string; negative: string; neutral: string }> = {
    earnings: {
      positive: 'earnings_beat',
      negative: 'earnings_miss',
      neutral: 'earnings_report'
    },
    analyst: {
      positive: 'analyst_upgrade',
      negative: 'analyst_downgrade',
      neutral: 'analyst_update'
    },
    fda: {
      positive: 'fda_approval',
      negative: 'fda_rejection',
      neutral: 'fda_update'
    },
    merger: {
      positive: 'merger_announcement',
      negative: 'merger_failed',
      neutral: 'merger_rumor'
    },
    leadership: {
      positive: 'leadership_hire',
      negative: 'leadership_departure',
      neutral: 'leadership_change'
    },
    legal: {
      positive: 'legal_victory',
      negative: 'legal_action',
      neutral: 'legal_update'
    },
    product: {
      positive: 'product_launch',
      negative: 'product_recall',
      neutral: 'product_update'
    }
  }
  
  return typeMap[category]?.[sentiment] || `${category}_${sentiment}`
}

/**
 * Check if a similar catalyst already exists (within 24h, same stock, same type)
 */
async function isDuplicate(
  stockId: string, 
  eventType: string, 
  headline: string
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { data } = await supabase
    .from('catalyst_events')
    .select('id, description')
    .eq('stock_id', stockId)
    .eq('event_type', eventType)
    .gte('detected_at', oneDayAgo)
    .limit(5)
  
  if (!data || data.length === 0) return false
  
  // Check for similar description (to avoid exact duplicates)
  const headlineLower = headline.toLowerCase()
  return data.some(existing => {
    const existingDesc = (existing.description || '').toLowerCase()
    // If headlines share significant overlap, consider duplicate
    return headlineLower.includes(existingDesc.slice(0, 50)) ||
           existingDesc.includes(headlineLower.slice(0, 50))
  })
}

/**
 * Detect catalysts for a single stock
 */
async function detectCatalystsForStock(
  stockId: string,
  ticker: string
): Promise<DetectedCatalyst[]> {
  const catalysts: DetectedCatalyst[] = []
  
  try {
    // Fetch recent news (last 2 days for 6-hour intervals)
    const news = await getCompanyNews(ticker, 2)
    
    for (const article of news) {
      const classification = classifyCatalyst(article)
      if (!classification) continue
      
      // Only process HIGH or CRITICAL urgency, or MEDIUM with strong sentiment
      if (classification.urgency === 'LOW' && article.sentiment === 'neutral') {
        continue
      }
      
      // Check for duplicates
      const duplicate = await isDuplicate(stockId, classification.eventType, article.headline)
      if (duplicate) continue
      
      catalysts.push({
        stockId,
        ticker,
        eventType: classification.eventType,
        urgency: classification.urgency,
        description: article.headline.slice(0, 500),
        sourceUrl: article.url || null,
        impactScore: classification.impactScore
      })
    }
    
    // Also check for analyst upgrades/downgrades
    const upgrades = await getUpgrades(ticker)
    const recentUpgrades = upgrades.filter(u => {
      const upgradeDate = new Date(u.date)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      return upgradeDate >= twoDaysAgo
    })
    
    for (const upgrade of recentUpgrades) {
      const isUpgrade = upgrade.action?.toLowerCase().includes('upgrade')
      const isDowngrade = upgrade.action?.toLowerCase().includes('downgrade')
      
      if (!isUpgrade && !isDowngrade) continue
      
      const eventType = isUpgrade ? 'analyst_upgrade' : 'analyst_downgrade'
      const description = `${upgrade.company}: ${upgrade.action} from ${upgrade.from} to ${upgrade.to}`
      
      const duplicate = await isDuplicate(stockId, eventType, description)
      if (duplicate) continue
      
      catalysts.push({
        stockId,
        ticker,
        eventType,
        urgency: 'MEDIUM',
        description,
        sourceUrl: null,
        impactScore: 20
      })
    }
  } catch (error) {
    console.error(`Error detecting catalysts for ${ticker}:`, error)
  }
  
  return catalysts
}

/**
 * Main detection function - scans all active stocks for catalysts
 */
export async function detectAllCatalysts(): Promise<DetectionResult> {
  const result: DetectionResult = {
    stocksScanned: 0,
    catalystsDetected: 0,
    catalystsInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
    detectedEvents: []
  }
  
  // Fetch all active stocks
  const { data: stocks, error: stocksError } = await supabase
    .from('stocks')
    .select('id, ticker')
    .eq('is_active', true)
  
  if (stocksError || !stocks) {
    result.errors.push(`Failed to fetch stocks: ${stocksError?.message}`)
    return result
  }
  
  result.stocksScanned = stocks.length
  
  // Process stocks in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(stock => detectCatalystsForStock(stock.id, stock.ticker))
    )
    
    for (const catalysts of batchResults) {
      result.detectedEvents.push(...catalysts)
    }
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  result.catalystsDetected = result.detectedEvents.length
  
  // Insert detected catalysts into database
  for (const catalyst of result.detectedEvents) {
    try {
      const { error } = await supabase
        .from('catalyst_events')
        .insert({
          stock_id: catalyst.stockId,
          event_type: catalyst.eventType,
          urgency: catalyst.urgency,
          description: catalyst.description,
          source_url: catalyst.sourceUrl,
          impact_on_score: catalyst.impactScore,
          detected_at: new Date().toISOString()
        })
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          result.duplicatesSkipped++
        } else {
          result.errors.push(`Insert error for ${catalyst.ticker}: ${error.message}`)
        }
      } else {
        result.catalystsInserted++
      }
    } catch (err) {
      result.errors.push(`Error inserting catalyst for ${catalyst.ticker}: ${err}`)
    }
  }
  
  return result
}

/**
 * Detect catalysts for a specific stock
 */
export async function detectCatalystsForTicker(ticker: string): Promise<DetectionResult> {
  const result: DetectionResult = {
    stocksScanned: 1,
    catalystsDetected: 0,
    catalystsInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
    detectedEvents: []
  }
  
  const { data: stock } = await supabase
    .from('stocks')
    .select('id, ticker')
    .eq('ticker', ticker.toUpperCase())
    .single()
  
  if (!stock) {
    result.errors.push(`Stock ${ticker} not found`)
    return result
  }
  
  const catalysts = await detectCatalystsForStock(stock.id, stock.ticker)
  result.detectedEvents = catalysts
  result.catalystsDetected = catalysts.length
  
  // Insert catalysts
  for (const catalyst of catalysts) {
    const { error } = await supabase
      .from('catalyst_events')
      .insert({
        stock_id: catalyst.stockId,
        event_type: catalyst.eventType,
        urgency: catalyst.urgency,
        description: catalyst.description,
        source_url: catalyst.sourceUrl,
        impact_on_score: catalyst.impactScore,
        detected_at: new Date().toISOString()
      })
    
    if (!error) {
      result.catalystsInserted++
    } else if (error.code === '23505') {
      result.duplicatesSkipped++
    }
  }
  
  return result
}

