/**
 * Shared checkpoint calculation utilities
 * Ensures consistent "ready" determination across frontend and backend
 */

export type CheckpointType = '5d' | '10d' | '20d'

export const CHECKPOINT_THRESHOLDS: Record<CheckpointType, number> = {
  '5d': 5,
  '10d': 10,
  '20d': 20
}

// Buffer in hours to account for timezone differences
// A checkpoint is considered "ready" when we're within 4 hours of the threshold
const READY_BUFFER_HOURS = 4

/**
 * Calculate days elapsed since prediction using UTC to ensure consistency
 * between client and server
 */
export function calculateDaysElapsedUTC(predictedAt: string | Date): number {
  const predictionDate = new Date(predictedAt)
  const now = new Date()
  
  // Use UTC timestamps to avoid timezone issues
  const predictionUTC = Date.UTC(
    predictionDate.getUTCFullYear(),
    predictionDate.getUTCMonth(),
    predictionDate.getUTCDate(),
    predictionDate.getUTCHours(),
    predictionDate.getUTCMinutes()
  )
  
  const nowUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes()
  )
  
  const diffMs = nowUTC - predictionUTC
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  
  return Math.max(0, diffDays)
}

/**
 * Check if a checkpoint is ready for evaluation
 * Uses a buffer to handle edge cases at the boundary
 */
export function isCheckpointReady(
  predictedAt: string | Date,
  checkpointType: CheckpointType,
  hasEvaluation: boolean
): boolean {
  if (hasEvaluation) return false
  
  const daysElapsed = calculateDaysElapsedUTC(predictedAt)
  const threshold = CHECKPOINT_THRESHOLDS[checkpointType]
  
  // Add buffer: ready when within READY_BUFFER_HOURS of threshold
  const bufferDays = READY_BUFFER_HOURS / 24
  return daysElapsed >= (threshold - bufferDays)
}

/**
 * Get the display value for days elapsed (whole number)
 */
export function getDaysElapsedDisplay(predictedAt: string | Date): number {
  return Math.floor(calculateDaysElapsedUTC(predictedAt))
}

/**
 * Calculate days remaining until a checkpoint is ready
 */
export function getDaysRemaining(
  predictedAt: string | Date,
  checkpointType: CheckpointType
): number {
  const daysElapsed = calculateDaysElapsedUTC(predictedAt)
  const threshold = CHECKPOINT_THRESHOLDS[checkpointType]
  const remaining = threshold - daysElapsed
  return Math.max(0, Math.ceil(remaining))
}

/**
 * Determine checkpoint status consistently
 */
export function getCheckpointStatus(
  predictedAt: string | Date,
  checkpointType: CheckpointType,
  hasEvaluation: boolean
): 'pending' | 'ready' | 'evaluated' {
  if (hasEvaluation) return 'evaluated'
  return isCheckpointReady(predictedAt, checkpointType, false) ? 'ready' : 'pending'
}

