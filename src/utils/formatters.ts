export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500'
  if (score >= 40) return 'text-amber-500'
  return 'text-rose-500'
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/30'
  if (score >= 40) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-rose-500/10 border-rose-500/30'
}

export function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'BUY': return 'text-emerald-500 bg-emerald-500/10'
    case 'HOLD': return 'text-amber-500 bg-amber-500/10'
    case 'SELL': return 'text-rose-500 bg-rose-500/10'
    default: return 'text-zinc-400 bg-zinc-500/10'
  }
}

export function formatDistanceToNow(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}