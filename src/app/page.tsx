'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import marketDataWebSocketService from '@/services/marketDataWebSocketService'
import contractWebSocketService from '@/services/contractWebSocketService'

export default function Home() {
  
  // WebSocket connection state
  const [isConnected, setIsConnected] = useState(false)

  // Initialize WebSocket connections
  useEffect(() => {
    console.log('Initializing WebSocket connections...')
    
    // Connect to market data WebSocket service
    marketDataWebSocketService.connect()  
    contractWebSocketService.connect()
    
    // Set up connection status listeners
    const handleConnect = () => {
      console.log('WebSocket connected in main page')
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log('WebSocket disconnected in main page')
      setIsConnected(false)
    }

    const handleError = (error: unknown) => {
      console.error('WebSocket error in main page:', error)
      setIsConnected(false)
    }

    // Set up Market Data WebSocket callbacks
    marketDataWebSocketService.onConnect(handleConnect)
    marketDataWebSocketService.onDisconnect(handleDisconnect)
    marketDataWebSocketService.onError(handleError)

    // Set up Contract WebSocket callbacks
    contractWebSocketService.onConnect(handleConnect)
    contractWebSocketService.onDisconnect(handleDisconnect)
    contractWebSocketService.onError(handleError)


    // Fallback: Show the app after 3 seconds even if WebSocket is not connected
    const fallbackTimeout = setTimeout(() => {
      if (!isConnected) {
        console.log('WebSocket connection timeout, showing app anyway')
        setIsConnected(true)
      }
    }, 3000)

    return () => {
      clearTimeout(fallbackTimeout)
      // Cleanup
      marketDataWebSocketService.onConnect(() => {})
      marketDataWebSocketService.onDisconnect(() => {})
      marketDataWebSocketService.onError(() => {})

      contractWebSocketService.onConnect(() => {})
      contractWebSocketService.onDisconnect(() => {})
      contractWebSocketService.onError(() => {})

    }
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Alice Blue API...</p>
        </div>
      </div>
    )
  }

  return <Dashboard />
}