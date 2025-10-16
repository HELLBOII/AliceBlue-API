import { io, Socket } from 'socket.io-client'
import { MarketData } from '@/types'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface MarketDataWebSocketService {
  connect: () => void
  disconnect: () => void
  subscribeToMarketData: (callback: (data: MarketData) => void) => void
  unsubscribeFromMarketData: () => void
  isConnected: () => boolean
  onConnect: (callback: () => void) => void
  onDisconnect: (callback: () => void) => void
  onError: (callback: (error: any) => void) => void
  getConnectionStatus: () => ConnectionStatus
}

class MarketDataWebSocketServiceImpl implements MarketDataWebSocketService {
  private marketDataSocket: Socket | null = null
  private marketDataCallback: ((data: MarketData) => void) | null = null
  private errorCallback: ((error: any) => void) | null = null
  private connectCallback: (() => void) | null = null
  private disconnectCallback: (() => void) | null = null
  
  private isConnecting = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect = false
  private lastConnected: number | null = null
  private lastError: string | null = null
  private lastDataReceived: number | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionStabilized = false
  private subscriptionTimeout: NodeJS.Timeout | null = null
  
  private readonly SOCKET_URL = 'http://localhost:8000'
  private readonly CONNECTION_TIMEOUT = 15000
  private readonly RECONNECT_DELAY = 2000
  private readonly HEARTBEAT_INTERVAL = 30000
  private readonly DATA_TIMEOUT = 60000
  private readonly STABILIZATION_DELAY = 2000

  constructor() {
    // Don't auto-connect in constructor
  }

  connect(): void {
    if (this.isConnecting) {
      console.log('Market Data WebSocket already connecting')
      return
    }

    if (this.isConnected()) {
      console.log('Market Data WebSocket already connected')
      return
    }

    console.log('🔌 Connecting to Market Data WebSocket service...')
    this.isConnecting = true
    this.lastError = null
    this.connectionStabilized = false
    
    try {
      // Connect to market data namespace with optimized settings
      this.marketDataSocket = io(`${this.SOCKET_URL}/market-data`, {
        transports: ['websocket'],
        timeout: this.CONNECTION_TIMEOUT,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.RECONNECT_DELAY,
        reconnectionDelayMax: 10000
      })
      
      this.setupMarketDataListeners()
      this.marketDataSocket.connect()

    } catch (error) {
      console.error('Error creating Market Data WebSocket connection:', error)
      this.handleConnectionError(error)
    }
  }

  private setupMarketDataListeners(): void {
    if (!this.marketDataSocket) return

    this.marketDataSocket.on('connect', () => {
      console.log('✅ Market Data WebSocket connected')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.lastConnected = Date.now()
      this.lastError = null
      this.lastDataReceived = Date.now()
      
      // Wait for connection to stabilize before subscribing
      this.subscriptionTimeout = setTimeout(() => {
        this.connectionStabilized = true
        console.log('📡 Connection stabilized, subscribing to market data...')
        this.marketDataSocket?.emit('subscribe_market_data')
        this.startHeartbeat()
        this.connectCallback?.()
      }, this.STABILIZATION_DELAY)
    })

    this.marketDataSocket.on('disconnect', (reason) => {
      console.log('❌ Market Data WebSocket disconnected:', reason)
      this.isConnecting = false
      this.connectionStabilized = false
      this.stopHeartbeat()
      
      if (this.subscriptionTimeout) {
        clearTimeout(this.subscriptionTimeout)
        this.subscriptionTimeout = null
      }
      
      this.disconnectCallback?.()
      
      // Auto-reconnect if not manual disconnect
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect()
      }
    })

    this.marketDataSocket.on('market_data_update', (data: any) => {
      this.lastDataReceived = Date.now()
      
      if (this.marketDataCallback && data?.data) {
        try {
          // Validate market data before processing
          const validatedData = this.validateMarketData(data.data)
          if (validatedData) {
            this.marketDataCallback(validatedData)
          }
        } catch (error) {
          console.error('Error processing market data updates:', error)
        }
      }
    })

    this.marketDataSocket.on('error', (error: any) => {
      console.error('Market Data WebSocket error:', error)
      this.handleConnectionError(error)
    })

    this.marketDataSocket.on('connect_error', (error: any) => {
      console.error('Market Data WebSocket connection error:', error)
      this.handleConnectionError(error)
    })

    this.marketDataSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Market Data WebSocket reconnected after ${attemptNumber} attempts`)
      this.reconnectAttempts = 0
      this.lastError = null
      this.lastDataReceived = Date.now()
    })

    this.marketDataSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Market Data WebSocket reconnection attempt ${attemptNumber}`)
      this.reconnectAttempts = attemptNumber
    })

    this.marketDataSocket.on('reconnect_error', (error: any) => {
      console.error('Market Data WebSocket reconnection error:', error)
      this.handleConnectionError(error)
    })

    this.marketDataSocket.on('reconnect_failed', () => {
      console.error('❌ Market Data WebSocket reconnection failed after all attempts')
      this.handleConnectionError(new Error('Reconnection failed'))
    })

    // Handle ping/pong for connection health
    this.marketDataSocket.on('ping', () => {
      console.log('🏓 Received ping from server')
    })

    this.marketDataSocket.on('pong', () => {
      console.log('🏓 Received pong from server')
      this.lastDataReceived = Date.now()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.isManualDisconnect) return
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Market Data WebSocket')
      this.handleConnectionError(new Error('Max reconnection attempts reached'))
      return
    }

    const delay = Math.min(this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), 10000)
    console.log(`🔄 Scheduling Market Data WebSocket reconnection in ${delay}ms`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected()) {
        console.log('💔 Heartbeat: Connection lost, attempting reconnect')
        this.scheduleReconnect()
        return
      }

      // Check if we've received data recently
      if (this.lastDataReceived && Date.now() - this.lastDataReceived > this.DATA_TIMEOUT) {
        console.log('💔 Heartbeat: No data received for too long, reconnecting')
        this.marketDataSocket?.disconnect()
        return
      }

      // Send ping to server
      this.marketDataSocket?.emit('ping')
      console.log('💓 Heartbeat: Sent ping to server')
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private validateMarketData(data: any): MarketData | null {
    try {
      // Validate NIFTY 50 data
      const nifty50 = data.nifty50
      if (!nifty50 || typeof nifty50.price !== 'number' || typeof nifty50.changePercent !== 'number') {
        console.warn('Invalid NIFTY 50 data:', nifty50)
        return null
      }

      // Validate NIFTY Bank data
      const niftyBank = data.niftyBank
      if (!niftyBank || typeof niftyBank.price !== 'number' || typeof niftyBank.changePercent !== 'number') {
        console.warn('Invalid NIFTY Bank data:', niftyBank)
        return null
      }

      // Validate price ranges (basic sanity checks)
      if (nifty50.price <= 0 || nifty50.price > 100000 || 
          niftyBank.price <= 0 || niftyBank.price > 100000) {
        console.warn('Price values out of expected range:', { nifty50: nifty50.price, niftyBank: niftyBank.price })
        return null
      }

      return {
        nifty50: {
          price: nifty50.price,
          changePercent: nifty50.changePercent
        },
        niftyBank: {
          price: niftyBank.price,
          changePercent: niftyBank.changePercent
        }
      }
    } catch (error) {
      console.error('Error validating market data:', error)
      return null
    }
  }

  private handleConnectionError(error: any): void {
    console.error('Market Data WebSocket connection error:', error)
    this.isConnecting = false
    this.lastError = error?.message || error?.description || 'Connection failed'
    this.errorCallback?.(error)
  }

  disconnect(): void {
    console.log('🔌 Disconnecting Market Data WebSocket service...')
    this.isManualDisconnect = true
    
    // Stop heartbeat
    this.stopHeartbeat()
    
    // Clear subscription timeout
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout)
      this.subscriptionTimeout = null
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.marketDataSocket) {
      this.marketDataSocket.disconnect()
      this.marketDataSocket = null
    }

    this.isConnecting = false
    this.reconnectAttempts = 0
    this.connectionStabilized = false
    this.lastDataReceived = null
  }

  subscribeToMarketData(callback: (data: MarketData) => void): void {
    this.marketDataCallback = callback
    console.log('📡 Subscribed to market data updates')
  }

  unsubscribeFromMarketData(): void {
    this.marketDataCallback = null
    console.log('📡 Unsubscribed from market data updates')
  }

  isConnected(): boolean {
    return this.marketDataSocket?.connected || false
  }

  onConnect(callback: () => void): void {
    this.connectCallback = callback
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback
  }

  onError(callback: (error: any) => void): void {
    this.errorCallback = callback
  }

  getConnectionStatus(): ConnectionStatus {
    if (this.isConnecting) return 'connecting'
    if (this.isConnected()) return 'connected'
    if (this.lastError) return 'error'
    return 'disconnected'
  }
}

// Export singleton instance
export default new MarketDataWebSocketServiceImpl()
