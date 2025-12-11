import { AGENT_INFO } from './AgentService'

export type ConflictCase = {
  agentName: string
  icon: string
  score: number
  keyPoint: string
}

export function getKeyPointFromScore(agentName: string, score: number): string {
  const stance = score >= 50 ? 'positive' : 'negative'
  
  const keyPoints: Record<string, Record<string, string>> = {
    fundamental: {
      positive: 'Strong financials and growth metrics',
      negative: 'Valuation concerns or weak fundamentals'
    },
    technical: {
      positive: 'Bullish chart patterns and momentum',
      negative: 'Bearish technical signals'
    },
    sentiment: {
      positive: 'Strong analyst ratings and market buzz',
      negative: 'Negative sentiment and downgrades'
    },
    macro: {
      positive: 'Favorable economic conditions',
      negative: 'Macro headwinds affecting outlook'
    },
    insider: {
      positive: 'Insider buying signals confidence',
      negative: 'Notable insider selling activity'
    },
    catalyst: {
      positive: 'Positive catalysts on horizon',
      negative: 'Potential negative catalysts ahead'
    }
  }
  
  const agentInfo = AGENT_INFO[agentName as keyof typeof AGENT_INFO]
  return keyPoints[agentName]?.[stance] || `${agentInfo?.displayName || agentName}: Score ${score}`
}

export function buildExplainer(
  bullishAgents: ConflictCase[],
  bearishAgents: ConflictCase[],
  recommendation: string,
  hasDeviation: boolean
): string {
  if (bullishAgents.length === 0 && bearishAgents.length === 0) {
    return 'Awaiting agent analysis...'
  }
  
  const dominantBearish = bearishAgents.find(a => a.score <= -50)
  const dominantBullish = bullishAgents.find(a => a.score >= 80)
  
  if (hasDeviation) {
    if (dominantBearish) {
      return `${dominantBearish.keyPoint} is creating uncertainty despite positive signals`
    }
    return 'Conflicting signals between agents; proceed with caution'
  }
  
  if (recommendation === 'BUY' && dominantBullish) {
    return `${dominantBullish.keyPoint} driving bullish outlook`
  }
  
  if (recommendation === 'SELL' && dominantBearish) {
    return `${dominantBearish.keyPoint} signals caution`
  }
  
  if (recommendation === 'HOLD') {
    if (bullishAgents.length > 0 && bearishAgents.length > 0) {
      return 'Mixed signals from agents; neutral stance recommended'
    }
    return 'Balanced outlook with no strong conviction either way'
  }
  
  return 'Analysis complete with mixed signals'
}

