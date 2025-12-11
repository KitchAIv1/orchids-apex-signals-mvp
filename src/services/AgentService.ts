import type { AgentScore, AgentName } from '@/types/database'

export type ConsensusLevel = 'STRONG' | 'MODERATE' | 'WEAK' | 'DIVIDED'

export type AgentDisplayInfo = {
  name: AgentName
  displayName: string
  description: string
  icon: string
}

export const AGENT_INFO: Record<AgentName, AgentDisplayInfo> = {
  fundamental: {
    name: 'fundamental',
    displayName: 'Fundamental Analysis',
    description: 'Evaluates financial health, revenue growth, and valuation metrics',
    icon: '📊'
  },
  technical: {
    name: 'technical',
    displayName: 'Technical/Momentum',
    description: 'Analyzes price patterns, RSI, MACD, and volume trends',
    icon: '📈'
  },
  sentiment: {
    name: 'sentiment',
    displayName: 'Sentiment Analysis',
    description: 'Tracks news sentiment, social buzz, and analyst ratings',
    icon: '💬'
  },
  macro: {
    name: 'macro',
    displayName: 'Macro Economic',
    description: 'Considers interest rates, sector trends, and economic indicators',
    icon: '🌍'
  },
  insider: {
    name: 'insider',
    displayName: 'Insider Activity',
    description: 'Monitors insider buying/selling and ownership changes',
    icon: '🔍'
  },
  catalyst: {
    name: 'catalyst',
    displayName: 'Catalyst Detection',
    description: 'Identifies earnings, announcements, and breaking news',
    icon: '⚡'
  }
}

export class AgentService {
  static getAgentInfo(agentName: string): AgentDisplayInfo {
    return AGENT_INFO[agentName as AgentName] || {
      name: agentName as AgentName,
      displayName: agentName,
      description: '',
      icon: '🤖'
    }
  }

  static calculateWeightedScore(agents: AgentScore[]): number {
    if (agents.length === 0) return 0
    
    const totalWeight = agents.reduce((sum, a) => sum + Number(a.weight), 0)
    if (totalWeight === 0) return 0

    const weightedSum = agents.reduce(
      (sum, a) => sum + a.score * Number(a.weight),
      0
    )
    return Math.round(weightedSum / totalWeight)
  }

  static identifyConsensusLevel(agents: AgentScore[]): ConsensusLevel {
    if (agents.length === 0) return 'WEAK'

    const scores = agents.map(a => a.score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    if (stdDev < 10) return 'STRONG'
    if (stdDev < 20) return 'MODERATE'
    if (stdDev < 30) return 'WEAK'
    return 'DIVIDED'
  }

  static getScoreLabel(score: number): 'BULLISH' | 'NEUTRAL' | 'BEARISH' {
    if (score >= 70) return 'BULLISH'
    if (score >= 40) return 'NEUTRAL'
    return 'BEARISH'
  }

  static getRecommendation(score: number): 'BUY' | 'HOLD' | 'SELL' {
    if (score > 70) return 'BUY'
    if (score >= 40) return 'HOLD'
    return 'SELL'
  }

  static getConfidenceFromConsensus(consensus: ConsensusLevel): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (consensus) {
      case 'STRONG': return 'HIGH'
      case 'MODERATE': return 'MEDIUM'
      default: return 'LOW'
    }
  }
}
