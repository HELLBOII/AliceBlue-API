import { useState, useEffect, useCallback } from 'react'
import { Fund, Position, Holdings } from '@/types'

interface PortfolioData {
  funds: Fund
  positions: Position[]
  holdings: Holdings[]
}

interface UsePortfolioDataOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UsePortfolioDataReturn {
  portfolioData: PortfolioData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshFunds: () => Promise<void>
  refreshPositions: () => Promise<void>
  refreshHoldings: () => Promise<void>
}

export function usePortfolioData(options: UsePortfolioDataOptions = {}): UsePortfolioDataReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // API configuration
  const API_BASE_URL = 'http://localhost:8000'

  // Fetch funds data
  const fetchFunds = useCallback(async (): Promise<Fund> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/funds`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching funds:', error)
      throw error
    }
  }, [])

  // Fetch positions data
  const fetchPositions = useCallback(async (): Promise<Position[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/positions`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw error
    }
  }, [])

  // Fetch holdings data
  const fetchHoldings = useCallback(async (): Promise<Holdings[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/holdings`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching holdings:', error)
      throw error
    }
  }, [])

  // Refresh funds only
  const refreshFunds = useCallback(async () => {
    try {
      console.log('🔄 Refreshing funds data...')
      const funds = await fetchFunds()
      setPortfolioData(prev => ({
        funds,
        positions: prev?.positions || [],
        holdings: prev?.holdings || []
      }))
      console.log('✅ Funds data refreshed:', funds)
    } catch (error) {
      console.error('Error refreshing funds:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh funds')
    }
  }, [fetchFunds])

  // Refresh positions only
  const refreshPositions = useCallback(async () => {
    try {
      console.log('🔄 Refreshing positions data...')
      const positions = await fetchPositions()
      setPortfolioData(prev => ({
        funds: prev?.funds || { available: 0, used: 0, total: 0 },
        positions,
        holdings: prev?.holdings || []
      }))
      console.log('✅ Positions data refreshed:', positions.length, 'positions')
    } catch (error) {
      console.error('Error refreshing positions:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh positions')
    }
  }, [fetchPositions])

  // Refresh holdings only
  const refreshHoldings = useCallback(async () => {
    try {
      console.log('🔄 Refreshing holdings data...')
      const holdings = await fetchHoldings()
      setPortfolioData(prev => ({
        funds: prev?.funds || { available: 0, used: 0, total: 0 },
        positions: prev?.positions || [],
        holdings
      }))
      console.log('✅ Holdings data refreshed:', holdings.length, 'holdings')
    } catch (error) {
      console.error('Error refreshing holdings:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh holdings')
    }
  }, [fetchHoldings])

  // Refresh all portfolio data
  const refresh = useCallback(async () => {
    if (loading) return

    console.log('🔄 Refreshing all portfolio data...')
    setLoading(true)
    setError(null)

    try {
      const [funds, positions, holdings] = await Promise.all([
        fetchFunds(),
        fetchPositions(),
        fetchHoldings()
      ])

      const portfolioData: PortfolioData = {
        funds,
        positions,
        holdings
      }

      setPortfolioData(portfolioData)
      console.log('✅ Portfolio data refreshed:', {
        funds: funds,
        positions: positions.length,
        holdings: holdings.length
      })
    } catch (error) {
      console.error('Error refreshing portfolio data:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh portfolio data')
    } finally {
      setLoading(false)
    }
  }, [loading, fetchFunds, fetchPositions, fetchHoldings])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    console.log(`🔄 Setting up auto-refresh for portfolio data every ${refreshInterval}ms`)
    const interval = setInterval(refresh, refreshInterval)

    return () => {
      console.log('🔄 Clearing portfolio auto-refresh interval')
      clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, refresh])

  return {
    portfolioData,
    loading,
    error,
    refresh,
    refreshFunds,
    refreshPositions,
    refreshHoldings
  }
}
