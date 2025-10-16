/**
 * Order status constants for consistent filtering across the application
 */

// Executed/Completed order statuses (orders that are no longer active)
export const EXECUTED_STATUSES = new Set([
  'completed', 'executed', 'filled', 'rejected', 'cancelled', 'complete',
  'COMPLETED', 'EXECUTED', 'FILLED', 'REJECTED', 'CANCELLED', 'COMPLETE'
])

// Pending/Open order statuses (orders that are still active)
export const PENDING_STATUSES = new Set([
  'pending', 'open', 'trigger pending', 'new', 'pending_new',
  'PENDING', 'OPEN', 'TRIGGER PENDING', 'NEW', 'PENDING_NEW'
])

// All possible order statuses
export const ALL_STATUSES = new Set([
  ...EXECUTED_STATUSES,
  ...PENDING_STATUSES
])

/**
 * Check if an order status indicates the order is executed/completed
 */
export const isExecutedStatus = (status: string): boolean => {
  return EXECUTED_STATUSES.has(status)
}

/**
 * Check if an order status indicates the order is pending/open
 */
export const isPendingStatus = (status: string): boolean => {
  return PENDING_STATUSES.has(status)
}

/**
 * Get normalized status (uppercase) for consistent comparison
 */
export const normalizeStatus = (status: string): string => {
  return status?.toUpperCase() || ''
}
