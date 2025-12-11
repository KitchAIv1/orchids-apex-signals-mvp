/**
 * Cron Schedule Configuration Service
 *
 * Defines the market-aligned scheduling strategy for automated operations.
 * All times are documented in both UTC and US Eastern Time for clarity.
 */

export type CronJobType = 'catalyst-monitor' | 'weekly-analysis'

export type ScheduleEntry = {
  cronExpression: string
  utcTime: string
  easternTime: string
  purpose: string
  tradingDays: boolean
}

export type CronJobConfig = {
  jobType: CronJobType
  endpoint: string
  schedules: ScheduleEntry[]
  rationale: string
}

/**
 * Catalyst Monitor Schedule
 *
 * Runs 4x daily on trading days (Mon-Fri), aligned with US market events.
 * The 5-gate trigger system prevents unnecessary re-analyses.
 */
export const CATALYST_MONITOR_CONFIG: CronJobConfig = {
  jobType: 'catalyst-monitor',
  endpoint: '/api/cron/catalyst-monitor',
  rationale: 'Market-aligned schedule catches catalysts when they matter most',
  schedules: [
    {
      cronExpression: '0 11 * * 1-5',
      utcTime: '11:00 UTC',
      easternTime: '6:00 AM ET',
      purpose: 'Pre-market: Catch overnight news, analyst upgrades/downgrades',
      tradingDays: true
    },
    {
      cronExpression: '0 15 * * 1-5',
      utcTime: '15:00 UTC',
      easternTime: '10:00 AM ET',
      purpose: 'Post-open: Catch market open reactions and early trading moves',
      tradingDays: true
    },
    {
      cronExpression: '30 21 * * 1-5',
      utcTime: '21:30 UTC',
      easternTime: '4:30 PM ET',
      purpose: 'Market close: Catch after-hours earnings (AMC releases)',
      tradingDays: true
    },
    {
      cronExpression: '0 3 * * 2-6',
      utcTime: '03:00 UTC',
      easternTime: '10:00 PM ET (prev day)',
      purpose: 'Evening digest: Catch evening news and international events',
      tradingDays: true
    }
  ]
}

/**
 * Weekly Analysis Schedule
 *
 * Runs once per week on Sunday evening to refresh all stock analyses
 * before the trading week begins.
 */
export const WEEKLY_ANALYSIS_CONFIG: CronJobConfig = {
  jobType: 'weekly-analysis',
  endpoint: '/api/cron/weekly-analysis',
  rationale: 'Sunday refresh ensures fresh analysis before Monday trading',
  schedules: [
    {
      cronExpression: '0 10 * * 0',
      utcTime: '10:00 UTC',
      easternTime: '5:00 AM ET (Sunday)',
      purpose: 'Weekly refresh of all stock analyses before market week',
      tradingDays: false
    }
  ]
}

/**
 * All cron job configurations
 */
export const CRON_CONFIGS: CronJobConfig[] = [
  CATALYST_MONITOR_CONFIG,
  WEEKLY_ANALYSIS_CONFIG
]

/**
 * Gate system thresholds used by catalyst trigger logic
 */
export const TRIGGER_THRESHOLDS = {
  cooldownHours: 6,
  maxReanalysesPerDay: 3,
  boundaryProximityPoints: 10,
  highConfidenceThreshold: 85,
  highConfidenceImpactRequired: 8
}

/**
 * Estimated cost per full analysis (6 agents + synthesis)
 * Used for cost savings calculations
 */
export const ANALYSIS_COST_ESTIMATE_USD = 0.18

/**
 * Get human-readable schedule summary
 */
export function getScheduleSummary(): string {
  const lines: string[] = [
    '=== APEX SIGNALS CRON SCHEDULE ===',
    '',
    '--- Catalyst Monitor (Mon-Fri) ---'
  ]

  for (const schedule of CATALYST_MONITOR_CONFIG.schedules) {
    lines.push(`  ${schedule.easternTime}: ${schedule.purpose}`)
  }

  lines.push('')
  lines.push('--- Weekly Analysis ---')

  for (const schedule of WEEKLY_ANALYSIS_CONFIG.schedules) {
    lines.push(`  ${schedule.easternTime}: ${schedule.purpose}`)
  }

  lines.push('')
  lines.push('--- Trigger Gates ---')
  lines.push(`  Cooldown: ${TRIGGER_THRESHOLDS.cooldownHours}h between re-analyses`)
  lines.push(`  Daily limit: ${TRIGGER_THRESHOLDS.maxReanalysesPerDay} catalyst-triggered analyses/day`)
  lines.push(`  Boundary proximity: ${TRIGGER_THRESHOLDS.boundaryProximityPoints} points`)

  return lines.join('\n')
}

