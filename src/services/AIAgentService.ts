import { openai } from '@/lib/openai'
import { AGENT_CONFIGS, buildAnalysisPrompt, type AgentPromptConfig } from '@/lib/prompts'
import type { AgentName, Stock } from '@/types/database'
import { createClient } from '@supabase/supabase-js'
import { getStockMarketData, formatDataForAgent, type StockMarketData } from './MarketDataService'

type AgentAnalysisResult = {
  score: number
  reasoning: string
  key_metric_1: string
  key_metric_2: string
  key_metric_3: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
}

type DebateSynthesisResult = {
  finalScore: number
  recommendation: 'BUY' | 'HOLD' | 'SELL'
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  holdingPeriod: string
  debateSummary: string
  riskFactors: string[]
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AGENT_ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    score: { type: 'number' as const, description: 'Score from -100 to +100' },
    reasoning: { type: 'string' as const, description: '2-4 sentence explanation of the score' },
    key_metric_1: { type: 'string' as const, description: 'First key metric with name and value e.g. "P/E Ratio: 28.5"' },
    key_metric_2: { type: 'string' as const, description: 'Second key metric with name and value' },
    key_metric_3: { type: 'string' as const, description: 'Third key metric with name and value' },
    confidence: { type: 'string' as const, enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Confidence level in this analysis' }
  },
  required: ['score', 'reasoning', 'key_metric_1', 'key_metric_2', 'key_metric_3', 'confidence'] as const,
  additionalProperties: false as const
}

const DEBATE_SYNTHESIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    finalScore: { type: 'number' as const, description: 'Final weighted score from -100 to +100' },
    recommendation: { type: 'string' as const, enum: ['BUY', 'HOLD', 'SELL'] },
    confidence: { type: 'string' as const, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    holdingPeriod: { type: 'string' as const, description: 'Suggested holding period e.g. "1-3 months"' },
    debateSummary: { type: 'string' as const, description: '3-5 sentence synthesis of the debate' },
    riskFactors: { type: 'array' as const, items: { type: 'string' as const }, description: 'Top 3-5 risk factors' },
    urgency: { type: 'string' as const, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Urgency to act based on catalysts' }
  },
  required: ['finalScore', 'recommendation', 'confidence', 'holdingPeriod', 'debateSummary', 'riskFactors', 'urgency'] as const,
  additionalProperties: false as const
}

export async function runAgentAnalysis(
  agentConfig: AgentPromptConfig,
  stock: Stock,
  marketData?: StockMarketData
): Promise<AgentAnalysisResult> {
  const liveData = marketData ? formatDataForAgent(agentConfig.name, marketData) : undefined

  const userPrompt = buildAnalysisPrompt(
    stock.ticker,
    stock.company_name || stock.ticker,
    stock.sector || 'Unknown',
    liveData
  )

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: agentConfig.systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'agent_analysis',
        strict: true,
        schema: AGENT_ANALYSIS_SCHEMA
      }
    } as never,
    temperature: 0.7
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error(`No response from ${agentConfig.name} agent`)
  }
  
  return JSON.parse(content) as AgentAnalysisResult
}

export async function runAllAgents(stock: Stock): Promise<Map<AgentName, AgentAnalysisResult>> {
  const agentNames: AgentName[] = ['fundamental', 'technical', 'sentiment', 'macro', 'insider', 'catalyst']
  const results = new Map<AgentName, AgentAnalysisResult>()

  let marketData: StockMarketData | undefined
  try {
    marketData = await getStockMarketData(stock.ticker)
    if (marketData.errors.length > 0) {
      console.warn(`Market data fetch warnings for ${stock.ticker}:`, marketData.errors)
    }
  } catch (error) {
    console.error(`Failed to fetch market data for ${stock.ticker}:`, error)
  }

  const promises = agentNames.map(async (name) => {
    const config = AGENT_CONFIGS[name]
    const result = await runAgentAnalysis(config, stock, marketData)
    return { name, result }
  })

  const outcomes = await Promise.all(promises)
  for (const { name, result } of outcomes) {
    results.set(name, result)
  }

  return results
}

export async function synthesizeDebate(
  stock: Stock,
  agentResults: Map<AgentName, AgentAnalysisResult>
): Promise<DebateSynthesisResult> {
  const agentSummaries = Array.from(agentResults.entries())
    .map(([name, result]) => {
      const config = AGENT_CONFIGS[name]
      return `**${config.displayName}** (weight: ${config.weight * 100}%):
Score: ${result.score}/100
Reasoning: ${result.reasoning}
Key Metrics: ${result.key_metric_1}, ${result.key_metric_2}, ${result.key_metric_3}`
    })
    .join('\n\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a senior portfolio manager synthesizing a multi-agent debate about a stock.
Weigh each agent's opinion according to their weight. Resolve conflicts logically.
Be decisive but acknowledge uncertainty where appropriate.`
      },
      {
        role: 'user',
        content: `Synthesize the following agent analyses for ${stock.ticker} (${stock.company_name}):

${agentSummaries}

Provide a final recommendation based on the weighted consensus.`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'debate_synthesis',
        strict: true,
        schema: DEBATE_SYNTHESIS_SCHEMA
      }
    } as never,
    temperature: 0.5
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error('Failed to get debate synthesis')
  }
  
  return JSON.parse(content) as DebateSynthesisResult
}

export async function persistAnalysis(
  stock: Stock,
  agentResults: Map<AgentName, AgentAnalysisResult>,
  synthesis: DebateSynthesisResult
): Promise<{ predictionId: string }> {
  const timestamp = new Date().toISOString()

  const agentScoreInserts = Array.from(agentResults.entries()).map(([name, result]) => ({
    stock_id: stock.id,
    agent_name: name,
    score: result.score,
    weight: AGENT_CONFIGS[name].weight,
    reasoning: result.reasoning,
    key_metrics: {
      metric_1: result.key_metric_1,
      metric_2: result.key_metric_2,
      metric_3: result.key_metric_3
    },
    timestamp
  }))

  const { error: deleteError } = await supabase
    .from('agent_scores')
    .delete()
    .eq('stock_id', stock.id)

  if (deleteError) {
    console.error('Error deleting old scores:', deleteError)
  }

  const { error: scoresError } = await supabase
    .from('agent_scores')
    .insert(agentScoreInserts)

  if (scoresError) {
    throw new Error(`Failed to insert agent scores: ${scoresError.message}`)
  }

  const { error: deletePredError } = await supabase
    .from('predictions')
    .delete()
    .eq('stock_id', stock.id)

  if (deletePredError) {
    console.error('Error deleting old prediction:', deletePredError)
  }

  const { data: prediction, error: predError } = await supabase
    .from('predictions')
    .insert({
      stock_id: stock.id,
      final_score: synthesis.finalScore,
      recommendation: synthesis.recommendation,
      confidence: synthesis.confidence,
      holding_period: synthesis.holdingPeriod,
      debate_summary: synthesis.debateSummary,
      risk_factors: synthesis.riskFactors,
      predicted_at: timestamp
    })
    .select('id')
    .single()

  if (predError || !prediction) {
    throw new Error(`Failed to insert prediction: ${predError?.message}`)
  }

  if (synthesis.urgency !== 'LOW') {
    await supabase.from('catalyst_events').insert({
      stock_id: stock.id,
      event_type: 'AI_ANALYSIS',
      urgency: synthesis.urgency,
      description: `AI multi-agent analysis completed with ${synthesis.recommendation} recommendation`,
      detected_at: timestamp,
      impact_on_score: synthesis.finalScore
    })
  }

  return { predictionId: prediction.id }
}

export async function analyzeStock(ticker: string): Promise<{
  success: boolean
  predictionId?: string
  recommendation?: string
  score?: number
  error?: string
}> {
  const { data: stock, error: stockError } = await supabase
    .from('stocks')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .single()

  if (stockError || !stock) {
    return { success: false, error: `Stock ${ticker} not found` }
  }

  try {
    const agentResults = await runAllAgents(stock as Stock)
    const synthesis = await synthesizeDebate(stock as Stock, agentResults)
    const { predictionId } = await persistAnalysis(stock as Stock, agentResults, synthesis)

    return { 
      success: true, 
      predictionId,
      recommendation: synthesis.recommendation,
      score: synthesis.finalScore
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}