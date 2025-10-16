'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MarketData } from '@/types'
import marketDataWebSocketService from '@/services/marketDataWebSocketService'

interface UseMarketDataOptions {
  autoConnect?: boolean
  enableWebSocket?: boolean
  refreshInterval?: number
}

interface UseMarketDataReturn {
  marketData: MarketData
  loading: boolean
  error: string | null
  isConnected: boolean
  refresh: () => Promise<void>
  connect: () => void
  disconnect: () => void
}

const DEFAULT_MARKET_DATA: MarketData = {
  nifty50: { price: 0, changePercent: 0 },
  niftyBank: { price: 0, changePercent: 0 }
}

export function useMarketData({
  autoConnect = true,
  enableWebSocket = true,
  refreshInterval = 0
}: UseMarketDataOptions = {}): UseMarketDataReturn {
  const [marketData, setMarketData] = useState<MarketData>(DEFAULT_MARKET_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const hasInitialized = useRef(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSubscribed = useRef(false)

  // Refresh market data (now only WebSocket-based)
  const refresh = useCallback(async () => {
    // Market data is now only available through WebSocket
    // This function is kept for compatibility but doesn't fetch from API
    console.log('Market data refresh requested - data comes from WebSocket only')
  }, [])

  // WebSocket connection management
  const connect = useCallback(() => {
    if (!enableWebSocket || isConnected) return
    
    console.log('Connecting to market data WebSocket...')
    marketDataWebSocketService.connect()
  }, [enableWebSocket, isConnected])

  const disconnect = useCallback(() => {
    if (!enableWebSocket) return
    
    console.log('Disconnecting from market data WebSocket...')
    marketDataWebSocketService.disconnect()
  }, [enableWebSocket])

  // Initialize market data
  useEffect(() => {
    if (hasInitialized.current) return
    
    hasInitialized.current = true
    
    // Initial fetch
    refresh()
    
    // Set up WebSocket if enabled
    if (enableWebSocket) {
      connect()
    }
  }, [refresh, connect, enableWebSocket])

  // WebSocket event handlers
  useEffect(() => {
    if (!enableWebSocket) return

    const handleConnect = () => {
      console.log('Market data WebSocket connected')
      setIsConnected(true)
      setError(null)
    }

    const handleDisconnect = () => {
      console.log('Market data WebSocket disconnected')
      setIsConnected(false)
    }

    const handleError = (error: any) => {
      console.error('Market data WebSocket error:', error)
      setError(error.message || 'WebSocket connection error')
      setIsConnected(false)
    }

    const handleMarketDataUpdate = (data: MarketData) => {
      console.log('📊 Received market data update:', data)
      setMarketData(data)
      setError(null)
    }

    // Set up event listeners
    marketDataWebSocketService.onConnect(handleConnect)
    marketDataWebSocketService.onDisconnect(handleDisconnect)
    marketDataWebSocketService.onError(handleError)
    
    // Subscribe to market data updates
    if (!isSubscribed.current) {
      marketDataWebSocketService.subscribeToMarketData(handleMarketDataUpdate)
      isSubscribed.current = true
    }

    return () => {
      // Cleanup
      marketDataWebSocketService.onConnect(() => {})
      marketDataWebSocketService.onDisconnect(() => {})
      marketDataWebSocketService.onError(() => {})
      marketDataWebSocketService.unsubscribeFromMarketData()
      isSubscribed.current = false
    }
  }, [enableWebSocket])

  // Refresh interval is no longer needed since data comes from WebSocket
  // Keeping this for compatibility but it won't do anything
  useEffect(() => {
    if (refreshInterval > 0) {
      console.log('Refresh interval specified but market data comes from WebSocket only')
    }
  }, [refreshInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSubscribed.current) {
        marketDataWebSocketService.unsubscribeFromMarketData()
      }
    }
  }, [])

  return {
    marketData,
    loading,
    error,
    isConnected,
    refresh,
    connect,
    disconnect
  }
}
