'use client'

import { AgentService, type AgentDisplayInfo } from '@/services/AgentService'
import type { AgentScore } from '@/types/database'

type Props = {
  agent: AgentScore
  info: AgentDisplayInfo
}

export function AgentReasoningPanel({ agent, info }: Props) {
  const metrics = agent.key_metrics as Record<string, unknown> | null
  
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-start gap-4 mb-4">
        <span className="text-3xl">{info.icon}</span>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{info.displayName}</h3>
          <p className="text-sm text-zinc-500">{info.description}</p>
        </div>
      </div>
      
      <div className="mb-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
        <p className="text-sm text-zinc-300 leading-relaxed">
          {agent.reasoning || 'No detailed reasoning available yet. Analysis will be generated during the next update cycle.'}
        </p>
      </div>
      
      {metrics && Object.keys(metrics).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Key Metrics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-zinc-800/30 px-3 py-2">
                <p className="text-xs text-zinc-500 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm font-medium text-zinc-200">
                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
