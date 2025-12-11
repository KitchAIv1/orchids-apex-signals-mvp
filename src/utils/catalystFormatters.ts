/**
 * Formats event type codes into human-readable labels
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    earnings_beat: 'Earnings Beat',
    earnings_miss: 'Earnings Miss',
    fda_approval: 'FDA Approval',
    fda_rejection: 'FDA Rejection',
    contract_win: 'Contract Win',
    contract_loss: 'Contract Loss',
    analyst_upgrade: 'Analyst Upgrade',
    analyst_downgrade: 'Analyst Downgrade',
    insider_buying: 'Insider Buying',
    insider_selling: 'Insider Selling',
    price_spike_up: 'Price Surge',
    price_spike_down: 'Price Drop',
    general_positive_news: 'Positive News',
    general_negative_news: 'Negative News',
    leadership_change: 'Leadership Change',
    AI_ANALYSIS: 'AI Analysis'
  }
  return labels[eventType] || eventType.replace(/_/g, ' ')
}

/**
 * Returns Tailwind classes for urgency badge styling
 */
export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    case 'HIGH': return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    case 'MEDIUM': return 'text-sky-400 bg-sky-500/15 border-sky-500/30'
    default: return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30'
  }
}

