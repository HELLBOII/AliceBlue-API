'use client'

import React, { createContext, useContext, useCallback, useRef, useState } from 'react'
import { Contract, MarketData, Order, Position, Holdings, Fund, Profile,TradeBook } from '@/types'

interface APIContextType {
  // Data
  marketData: MarketData
  contracts: Contract[]
  orders: Order[]
  tradeBook: TradeBook[]
  positions: Position[]
  holdings: Holdings[]
  funds: Fund[]
  profile: Profile[]
  
  // API Functions
  getContracts: () => Promise<unknown>
  getOrders: () => Promise<unknown>
  getTradeBook: () => Promise<unknown>
  getPositions: () => Promise<unknown>
  getHoldings: () => Promise<unknown>
  getFunds: () => Promise<unknown>
  getProfile: () => Promise<unknown>
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>
  
  // States
  loading: Record<string, boolean>
  errors: Record<string, string | null>
  
  // Cache
  clearCache: () => void
  isDataStale: () => boolean
}

const APIContext = createContext<APIContextType | undefined>(undefined)

interface APIContextProviderProps {
  children: React.ReactNode
}

// API configuration - moved outside component to prevent recreation
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
}

export function APIContextProvider({ children }: APIContextProviderProps) {
  // Data state
  const [marketData] = useState<MarketData>({
    nifty50: { price: 0, changePercent: 0 },
    niftyBank: { price: 0, changePercent: 0 }
  })
  const [contracts, setContracts] = useState<Contract[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tradeBook, setTradeBook] = useState<TradeBook[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [holdings, setHoldings] = useState<Holdings[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [profile, setProfile] = useState<Profile[]>([])

  // Simplified state management
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  // Request tracking
  const pendingRequests = useRef<Map<string, Promise<unknown>>>(new Map())

  // Generic API call function
  const apiCall = useCallback(async (
    key: string,
    url: string,
    setter: (data: unknown) => void,
    options: RequestInit = {}
  ): Promise<unknown> => {
    // Check if request is already pending
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!
    }

    setLoading(prev => ({ ...prev, [key]: true }))
    setErrors(prev => ({ ...prev, [key]: null }))

    const requestPromise = fetch(`${API_CONFIG.baseURL}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    })
    .then((data) => {
      setter(data)
      return data
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'API call failed'
      setErrors(prev => ({ ...prev, [key]: errorMessage }))
      throw error
    })
    .finally(() => {
      setLoading(prev => ({ ...prev, [key]: false }))
      pendingRequests.current.delete(key)
    })

    pendingRequests.current.set(key, requestPromise)
    return requestPromise
  }, [API_CONFIG.baseURL])

  // Simplified API functions
  const getContracts = useCallback(() => apiCall('contracts', '/api/contracts', (data) => setContracts(Array.isArray(data) ? data : [])), [apiCall])
  const getOrders = useCallback(() => apiCall('orders', '/api/orders', (data) => setOrders(Array.isArray(data) ? data : [])), [apiCall])
  const getPositions = useCallback(() => apiCall('positions', '/api/positions', (data) => setPositions(Array.isArray(data) ? data : [])), [apiCall])
  const getHoldings = useCallback(() => apiCall('holdings', '/api/holdings', (data) => setHoldings(Array.isArray(data) ? data : [])), [apiCall])
  const getFunds = useCallback(() => apiCall('funds', '/api/funds', (data) => setFunds(Array.isArray(data) ? data : [])), [apiCall])
  const getProfile = useCallback(() => apiCall('profile', '/api/profile', (data) => setProfile([data as Profile])), [apiCall])
  const getTradeBook = useCallback(() => apiCall('tradebook', '/api/trade-book', (data) => setTradeBook(Array.isArray(data) ? data : [])), [apiCall])


  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/cancel-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const data = await response.json()
      return { success: data.success || false, error: data.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' }
    }
  }, [API_CONFIG.baseURL])


  // Cache management
  const clearCache = useCallback(() => {
    pendingRequests.current.clear()
  }, [])

  const isDataStale = useCallback((): boolean => {
    // Always return true since we removed caching
    return true
  }, [])

  const value: APIContextType = {
    // Data
    marketData,
    contracts,
    orders,
    tradeBook,
    positions,
    holdings,
    funds,
    profile,
    
    // API functions
    getContracts,
    getOrders,
    getTradeBook,
    getPositions,
    getHoldings,
    getFunds,
    getProfile,
    cancelOrder,
    
    // States
    loading,
    errors,
    
    // Cache
    clearCache,
    isDataStale
  }

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  )
}

export function useAPI() {
  const context = useContext(APIContext)
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIContextProvider')
  }
  return context
}
