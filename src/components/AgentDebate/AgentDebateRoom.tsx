'use client'

import { useState } from 'react'
import { AgentCard } from './AgentCard'
import { AgentReasoningPanel } from './AgentReasoningPanel'
import { DebateSummary } from './DebateSummary'
import { AgentService, AGENT_INFO } from '@/services/AgentService'
import type { AgentScore, AgentName } from '@/types/database'

type Props = {
  agents: AgentScore[]
  debateSummary?: string | null
}

const AGENT_ORDER: AgentName[] = ['fundamental', 'technical', 'sentiment', 'macro', 'insider', 'catalyst']

export function AgentDebateRoom({ agents, debateSummary }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(
    agents[0]?.agent_name || null
  )
  
  const sortedAgents = AGENT_ORDER.map(name => 
    agents.find(a => a.agent_name === name)
  ).filter(Boolean) as AgentScore[]
  
  const selected = sortedAgents.find(a => a.agent_name === selectedAgent)
  const selectedInfo = selected ? AgentService.getAgentInfo(selected.agent_name) : null

  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">No agent analysis available yet</p>
        <p className="text-sm text-zinc-600 mt-1">Analysis will be generated during the next update cycle</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          The AI Agent Debate Room
        </h2>
        <p className="text-sm text-zinc-400">
          Six specialized AI agents analyze this stock from different perspectives. Click each agent to see their detailed reasoning.
        </p>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {sortedAgents.map(agent => {
          const info = AgentService.getAgentInfo(agent.agent_name)
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              info={info}
              isSelected={selectedAgent === agent.agent_name}
              onSelect={() => setSelectedAgent(agent.agent_name)}
            />
          )
        })}
      </div>
      
      {selected && selectedInfo && (
        <AgentReasoningPanel agent={selected} info={selectedInfo} />
      )}
      
      <DebateSummary agents={sortedAgents} debateSummary={debateSummary} />
    </div>
  )
}
