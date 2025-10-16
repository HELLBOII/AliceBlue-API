import { io, Socket } from 'socket.io-client'
import { WS_BASE_URL } from '@/config/appConfig'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ContractData {
  price: number
  changePercent: number
  previousPrice?: number
}

interface ContractUpdates {
  [token: string]: ContractData
}

interface WebSocketError {
  message?: string
  description?: string
}

interface ContractWebSocketService {
  connect: () => void
  disconnect: () => void
  subscribeToContractUpdates: () => void
  unsubscribeFromContractUpdates: () => void
  subscribeToSpecificContract: (token: string, callback: (data: ContractUpdates) => void) => void
  unsubscribeFromSpecificContract: (token: string) => void
  isConnected: () => boolean
  onConnect: (callback: () => void) => void
  onDisconnect: (callback: () => void) => void
  onError: (callback: (error: WebSocketError) => void) => void
  getConnectionStatus: () => ConnectionStatus
}

class ContractWebSocketServiceImpl implements ContractWebSocketService {
  private contractsSocket: Socket | null = null
  private contractCallback: ((data: ContractUpdates) => void) | null = null
  private specificContractCallbacks: Map<string, (data: ContractUpdates) => void> = new Map()
  private errorCallback: ((error: WebSocketError) => void) | null = null
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
  
  private readonly SOCKET_URL = WS_BASE_URL
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
      console.log('Contract WebSocket already connecting')
      return
    }

    if (this.isConnected()) {
      console.log('Contract WebSocket already connected')
      return
    }

    console.log('🔌 Connecting to Contract WebSocket service...')
    this.isConnecting = true
    this.lastError = null
    this.connectionStabilized = false
    
    try {
      // Connect to contracts namespace with optimized settings
      this.contractsSocket = io(`${this.SOCKET_URL}/contracts`, {
        transports: ['websocket'],
        timeout: this.CONNECTION_TIMEOUT,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.RECONNECT_DELAY,
        reconnectionDelayMax: 10000
      })
      
      this.setupListeners()
      this.contractsSocket.connect()

    } catch (error) {
      console.error('Error creating Contract WebSocket connection:', error)
      this.handleConnectionError(error)
    }
  }

  private setupListeners(): void {
    if (!this.contractsSocket) return

    this.contractsSocket.on('connect', () => {
      console.log('✅ Contract WebSocket connected')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.lastConnected = Date.now()
      this.lastError = null
      this.lastDataReceived = Date.now()
      
      // Wait for connection to stabilize before subscribing
      this.subscriptionTimeout = setTimeout(() => {
        this.connectionStabilized = true
        console.log('📡 Connection stabilized, re-subscribing to contracts...')
        
        // Re-subscribe to all specific contracts
        console.log(`📤 Re-subscribing to ${this.specificContractCallbacks.size} specific contracts`)
        this.specificContractCallbacks.forEach((callback, token) => {
          console.log(`📤 Sending subscription request for token: ${token}`)
          this.contractsSocket?.emit('subscribe_specific_contract', { token })
        })
        
        this.startHeartbeat()
        this.connectCallback?.()
      }, this.STABILIZATION_DELAY)
    })

    this.contractsSocket.on('disconnect', (reason) => {
      console.log('❌ Contract WebSocket disconnected:', reason)
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

    this.contractsSocket.on('contract_updates', (data: { data?: ContractUpdates }) => {
      this.lastDataReceived = Date.now()
      
      if (data?.data) {
        try {
          // Validate and process contract data
          const validatedData = this.validateContractData(data.data)
          if (validatedData) {
            // Only call specific contract callbacks for subscribed contracts
            this.specificContractCallbacks.forEach((callback, token) => {
              if (validatedData[token]) {
                console.log(`📊 Contract update for token ${token}:`, validatedData[token])
                callback({ [token]: validatedData[token] })
              }
            })
          }
        } catch (error) {
          console.error('Error processing contract updates:', error)
        }
      }
    })

    this.contractsSocket.on('error', (error: WebSocketError) => {
      console.error('Contract WebSocket error:', error)
      this.handleConnectionError(error)
    })

    this.contractsSocket.on('connect_error', (error: WebSocketError) => {
      console.error('Contract WebSocket connection error:', error)
      this.handleConnectionError(error)
    })

    this.contractsSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Contract WebSocket reconnected after ${attemptNumber} attempts`)
      this.reconnectAttempts = 0
      this.lastError = null
      this.lastDataReceived = Date.now()
    })

    this.contractsSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Contract WebSocket reconnection attempt ${attemptNumber}`)
      this.reconnectAttempts = attemptNumber
    })

    this.contractsSocket.on('reconnect_error', (error: WebSocketError) => {
      console.error('Contract WebSocket reconnection error:', error)
      this.handleConnectionError(error)
    })

    this.contractsSocket.on('reconnect_failed', () => {
      console.error('❌ Contract WebSocket reconnection failed after all attempts')
      this.handleConnectionError(new Error('Reconnection failed'))
    })

    // Handle ping/pong for connection health
    this.contractsSocket.on('ping', () => {
      console.log('🏓 Received ping from server')
    })

    this.contractsSocket.on('pong', () => {
      console.log('🏓 Received pong from server')
      this.lastDataReceived = Date.now()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.isManualDisconnect) return
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Contract WebSocket')
      this.handleConnectionError(new Error('Max reconnection attempts reached'))
      return
    }

    const delay = Math.min(this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), 10000)
    console.log(`🔄 Scheduling Contract WebSocket reconnection in ${delay}ms`)
    
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
        this.contractsSocket?.disconnect()
        return
      }

      // Send ping to server
      this.contractsSocket?.emit('ping')
      console.log('💓 Heartbeat: Sent ping to server')
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private validateContractData(data: unknown): ContractUpdates | null {
    try {
      // Validate contract data structure
      if (!data || typeof data !== 'object') {
        console.warn('Invalid contract data structure:', data)
        return null
      }

      // Validate each contract token's data
      const validatedData: ContractUpdates = {}
      for (const [token, contractData] of Object.entries(data)) {
        if (contractData && typeof contractData === 'object') {
          const contract = contractData as Record<string, unknown>
          
          // Basic validation for contract data
          if (typeof contract.price === 'number' && 
              typeof contract.changePercent === 'number' &&
              contract.price > 0 && contract.price < 100000) {
            validatedData[token] = {
              price: contract.price,
              changePercent: contract.changePercent,
              previousPrice: typeof contract.previousPrice === 'number' ? contract.previousPrice : contract.price
            }
          } else {
            console.warn(`Invalid contract data for token ${token}:`, contract)
          }
        }
      }

      return Object.keys(validatedData).length > 0 ? validatedData : null
    } catch (error) {
      console.error('Error validating contract data:', error)
      return null
    }
  }

  private handleConnectionError(error: unknown): void {
    console.error('Contract WebSocket connection error:', error)
    this.isConnecting = false
    const errorMessage = error instanceof Error ? error.message : 
      (error && typeof error === 'object' && 'message' in error) ? String(error.message) :
      (error && typeof error === 'object' && 'description' in error) ? String(error.description) :
      'Connection failed'
    this.lastError = errorMessage
    this.errorCallback?.(error as WebSocketError)
  }

  disconnect(): void {
    console.log('🔌 Disconnecting Contract WebSocket service...')
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

    if (this.contractsSocket) {
      this.contractsSocket.disconnect()
      this.contractsSocket = null
    }

    // Clear all subscriptions
    this.contractCallback = null
    this.specificContractCallbacks.clear()

    this.isConnecting = false
    this.reconnectAttempts = 0
    this.connectionStabilized = false
    this.lastDataReceived = null
  }

  subscribeToContractUpdates(): void {
    // Deprecated: Use subscribeToSpecificContract instead
    console.warn('subscribeToContractUpdates is deprecated. Use subscribeToSpecificContract instead.')
  }

  unsubscribeFromContractUpdates(): void {
    // Deprecated: Use unsubscribeFromSpecificContract instead
    console.warn('unsubscribeFromContractUpdates is deprecated. Use unsubscribeFromSpecificContract instead.')
  }

  subscribeToSpecificContract(token: string, callback: (data: ContractUpdates) => void): void {
    this.specificContractCallbacks.set(token, callback)
    console.log(`📡 Subscribed to specific contract updates for token: ${token}`)
    
    // Emit subscription to server if connected, otherwise it will be sent on connect
    if (this.isConnected()) {
      console.log(`📤 Sending subscription request for token: ${token}`)
      this.contractsSocket?.emit('subscribe_specific_contract', { token })
    } else {
      console.log(`📤 Subscription queued for token: ${token} (WebSocket not connected yet)`)
    }
  }

  unsubscribeFromSpecificContract(token: string): void {
    this.specificContractCallbacks.delete(token)
    console.log(`📡 Unsubscribed from specific contract updates for token: ${token}`)
    
    // Emit unsubscription to server if connected
    if (this.isConnected()) {
      this.contractsSocket?.emit('unsubscribe_specific_contract', { token })
    }
  }

  isConnected(): boolean {
    return this.contractsSocket?.connected || false
  }

  onConnect(callback: () => void): void {
    this.connectCallback = callback
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback
  }

  onError(callback: (error: WebSocketError) => void): void {
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
const contractWebSocketService = new ContractWebSocketServiceImpl()
export default contractWebSocketService
