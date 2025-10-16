/**
 * Portfolio refresh utilities for order actions
 * This module provides functions to refresh portfolio data after specific order actions
 */

export interface PortfolioRefreshOptions {
  refreshFunds?: boolean
  refreshPositions?: boolean
  refreshHoldings?: boolean
  delay?: number
}

/**
 * Refresh portfolio data after order placement
 * This should be called after successful order placement
 */
export async function refreshAfterOrderPlacement(
  refreshFunctions: {
    refreshFunds: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshHoldings: () => Promise<void>
  },
  options: PortfolioRefreshOptions = {}
): Promise<void> {
  const {
    refreshFunds = true,
    refreshPositions = true,
    refreshHoldings = false,
    delay = 1000
  } = options

  console.log('🔄 Refreshing portfolio after order placement...')

  // Wait a bit for the order to be processed
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  try {
    const refreshPromises: Promise<void>[] = []

    if (refreshFunds) {
      refreshPromises.push(refreshFunctions.refreshFunds())
    }

    if (refreshPositions) {
      refreshPromises.push(refreshFunctions.refreshPositions())
    }

    if (refreshHoldings) {
      refreshPromises.push(refreshFunctions.refreshHoldings())
    }

    await Promise.all(refreshPromises)
    console.log('✅ Portfolio refreshed after order placement')
  } catch (error) {
    console.error('Error refreshing portfolio after order placement:', error)
  }
}

/**
 * Refresh portfolio data after order cancellation
 * This should be called after successful order cancellation
 */
export async function refreshAfterOrderCancellation(
  refreshFunctions: {
    refreshFunds: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshHoldings: () => Promise<void>
  },
  options: PortfolioRefreshOptions = {}
): Promise<void> {
  const {
    refreshFunds = true,
    refreshPositions = true,
    refreshHoldings = false,
    delay = 500
  } = options

  console.log('🔄 Refreshing portfolio after order cancellation...')

  // Wait a bit for the cancellation to be processed
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  try {
    const refreshPromises: Promise<void>[] = []

    if (refreshFunds) {
      refreshPromises.push(refreshFunctions.refreshFunds())
    }

    if (refreshPositions) {
      refreshPromises.push(refreshFunctions.refreshPositions())
    }

    if (refreshHoldings) {
      refreshPromises.push(refreshFunctions.refreshHoldings())
    }

    await Promise.all(refreshPromises)
    console.log('✅ Portfolio refreshed after order cancellation')
  } catch (error) {
    console.error('Error refreshing portfolio after order cancellation:', error)
  }
}

/**
 * Refresh portfolio data after square off
 * This should be called after successful square off
 */
export async function refreshAfterSquareOff(
  refreshFunctions: {
    refreshFunds: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshHoldings: () => Promise<void>
  },
  options: PortfolioRefreshOptions = {}
): Promise<void> {
  const {
    refreshFunds = true,
    refreshPositions = true,
    refreshHoldings = true,
    delay = 1500
  } = options

  console.log('🔄 Refreshing portfolio after square off...')

  // Wait a bit for the square off to be processed
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  try {
    const refreshPromises: Promise<void>[] = []

    if (refreshFunds) {
      refreshPromises.push(refreshFunctions.refreshFunds())
    }

    if (refreshPositions) {
      refreshPromises.push(refreshFunctions.refreshPositions())
    }

    if (refreshHoldings) {
      refreshPromises.push(refreshFunctions.refreshHoldings())
    }

    await Promise.all(refreshPromises)
    console.log('✅ Portfolio refreshed after square off')
  } catch (error) {
    console.error('Error refreshing portfolio after square off:', error)
  }
}

/**
 * Refresh portfolio data after any order modification
 * This should be called after successful order modification
 */
export async function refreshAfterOrderModification(
  refreshFunctions: {
    refreshFunds: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshHoldings: () => Promise<void>
  },
  options: PortfolioRefreshOptions = {}
): Promise<void> {
  const {
    refreshFunds = true,
    refreshPositions = true,
    refreshHoldings = false,
    delay = 1000
  } = options

  console.log('🔄 Refreshing portfolio after order modification...')

  // Wait a bit for the modification to be processed
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  try {
    const refreshPromises: Promise<void>[] = []

    if (refreshFunds) {
      refreshPromises.push(refreshFunctions.refreshFunds())
    }

    if (refreshPositions) {
      refreshPromises.push(refreshFunctions.refreshPositions())
    }

    if (refreshHoldings) {
      refreshPromises.push(refreshFunctions.refreshHoldings())
    }

    await Promise.all(refreshPromises)
    console.log('✅ Portfolio refreshed after order modification')
  } catch (error) {
    console.error('Error refreshing portfolio after order modification:', error)
  }
}
