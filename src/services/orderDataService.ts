import { io, Socket } from 'socket.io-client'

export interface OrderWatchConfig {
  orderId: string
  symbol: string
  exchange: string
  quantity: number
  price: number
  transactionType: 'B' | 'S'
  stopLossMargin?: number
  stopLossMarginType?: string
  accountName: string
  instrument: Record<string, unknown>
  autoStopLoss?: boolean
}

export interface OrderExecutionEvent {
  orderId: string
  symbol: string
  executedPrice: number
  executedQuantity: number
  timestamp: number
  accountName: string
}

export interface StopLossTriggerEvent {
  mainOrderId: string
  stopLossOrderId: string
  stopLossPrice: number
  symbol: string
  accountName: string
  timestamp: number
}

interface OrderWatchService {
  connect: () => void
  disconnect: () => void
  watchOrder: (config: OrderWatchConfig) => void
  stopWatchingOrder: (orderId: string) => void
  onOrderExecuted: (callback: (event: OrderExecutionEvent) => void) => void
  onStopLossTriggered: (callback: (event: StopLossTriggerEvent) => void) => void
  isConnected: () => boolean
  getWatchedOrders: () => OrderWatchConfig[]
}

class OrderWatchServiceImpl implements OrderWatchService {
  private orderWatchSocket: Socket | null = null
  private watchedOrders: Map<string, OrderWatchConfig> = new Map()
  private orderExecutedCallback: ((event: OrderExecutionEvent) => void) | null = null
  private stopLossTriggeredCallback: ((event: StopLossTriggerEvent) => void) | null = null
  
  private isConnecting = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private orderCheckInterval: NodeJS.Timeout | null = null
  
  private readonly SOCKET_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'wss://localhost:8000'
  private readonly CONNECTION_TIMEOUT = 15000
  private readonly RECONNECT_DELAY = 2000
  private readonly HEARTBEAT_INTERVAL = 30000
  private readonly ORDER_CHECK_INTERVAL = 5000 // Check orders every 5 seconds

  constructor() {
    // Don't auto-connect in constructor
  }

  connect(): void {
    if (this.isConnecting) {
      console.log('Order Watch WebSocket already connecting')
      return
    }

    if (this.isConnected()) {
      console.log('Order Watch WebSocket already connected')
      return
    }

    console.log('🔍 Connecting to Order Watch WebSocket service...')
    this.isConnecting = true
    
    try {
      this.orderWatchSocket = io(`${this.SOCKET_URL}/order-watch`, {
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
      this.orderWatchSocket.connect()

    } catch (error) {
      console.error('Error creating Order Watch WebSocket connection:', error)
      this.handleConnectionError(error)
    }
  }

  private setupListeners(): void {
    if (!this.orderWatchSocket) return

    this.orderWatchSocket.on('connect', () => {
      console.log('✅ Order Watch WebSocket connected')
      this.isConnecting = false
      this.reconnectAttempts = 0
      
      // Send all currently watched orders to server
      this.syncWatchedOrders()
      
      this.startHeartbeat()
      this.startOrderChecking()
    })

    this.orderWatchSocket.on('disconnect', (reason) => {
      console.log('❌ Order Watch WebSocket disconnected:', reason)
      this.isConnecting = false
      this.stopHeartbeat()
      this.stopOrderChecking()
      
      // Auto-reconnect if not manual disconnect
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect()
      }
    })

    this.orderWatchSocket.on('order_executed', (data: OrderExecutionEvent) => {
      console.log('📈 Order executed:', data)
      
      // Remove from watched orders
      this.watchedOrders.delete(data.orderId)
      
      // Notify callback
      this.orderExecutedCallback?.(data)
      
      // Trigger stoploss if configured
      this.triggerStopLossForExecutedOrder(data)
    })

    this.orderWatchSocket.on('stop_loss_triggered', (data: StopLossTriggerEvent) => {
      console.log('🛡️ Stop loss triggered:', data)
      this.stopLossTriggeredCallback?.(data)
    })

    this.orderWatchSocket.on('stop_loss_error', (data: Record<string, unknown>) => {
      console.error('❌ Stop loss error:', data)
      // You can add a callback for stop loss errors if needed
    })

    this.orderWatchSocket.on('error', (error: unknown) => {
      console.error('Order Watch WebSocket error:', error)
      this.handleConnectionError(error)
    })

    this.orderWatchSocket.on('connect_error', (error: unknown) => {
      console.error('Order Watch WebSocket connection error:', error)
      this.handleConnectionError(error)
    })

    this.orderWatchSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Order Watch WebSocket reconnected after ${attemptNumber} attempts`)
      this.reconnectAttempts = 0
      this.syncWatchedOrders()
    })

    this.orderWatchSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Order Watch WebSocket reconnection attempt ${attemptNumber}`)
      this.reconnectAttempts = attemptNumber
    })

    this.orderWatchSocket.on('reconnect_error', (error: unknown) => {
      console.error('Order Watch WebSocket reconnection error:', error)
      this.handleConnectionError(error)
    })

    this.orderWatchSocket.on('reconnect_failed', () => {
      console.error('❌ Order Watch WebSocket reconnection failed after all attempts')
      this.handleConnectionError(new Error('Reconnection failed'))
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.isManualDisconnect) return
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Order Watch WebSocket')
      this.handleConnectionError(new Error('Max reconnection attempts reached'))
      return
    }

    const delay = Math.min(this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), 10000)
    console.log(`🔄 Scheduling Order Watch WebSocket reconnection in ${delay}ms`)
    
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
        console.log('💔 Heartbeat: Order Watch connection lost, attempting reconnect')
        this.scheduleReconnect()
        return
      }

      // Send ping to server
      this.orderWatchSocket?.emit('ping')
      console.log('💓 Heartbeat: Sent ping to Order Watch server')
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private startOrderChecking(): void {
    this.stopOrderChecking()
    
    this.orderCheckInterval = setInterval(() => {
      if (!this.isConnected()) return
      
      const ordersToCheck = Array.from(this.watchedOrders.values())
      console.log('🔍 Sending check_order_status with orders:', ordersToCheck.length)
      console.log('🔍 Order IDs being checked:', ordersToCheck.map(o => o.orderId))
      
      // Send periodic order status check
      this.orderWatchSocket?.emit('check_order_status', {
        watchedOrders: ordersToCheck
      })
    }, this.ORDER_CHECK_INTERVAL)
  }

  private stopOrderChecking(): void {
    if (this.orderCheckInterval) {
      clearInterval(this.orderCheckInterval)
      this.orderCheckInterval = null
    }
  }

  private syncWatchedOrders(): void {
    if (!this.isConnected() || this.watchedOrders.size === 0) return
    
    console.log(`🔄 Syncing ${this.watchedOrders.size} watched orders with server`)
    this.orderWatchSocket?.emit('sync_watched_orders', {
      orders: Array.from(this.watchedOrders.values())
    })
  }

  private async triggerStopLossForExecutedOrder(executionEvent: OrderExecutionEvent): Promise<void> {
    const watchedOrder = this.watchedOrders.get(executionEvent.orderId)
    if (!watchedOrder) return

    try {
      console.log(`🛡️ Stop loss will be handled automatically by the server for order: ${executionEvent.orderId}`)
      
      // The server now handles stop-loss automatically via the cloned place_stop_loss_order_for_monitoring function
      // No need to call the API endpoint anymore
      
    } catch (error) {
      console.error('❌ Error in stop loss handling:', error)
    }
  }

  private handleConnectionError(error: unknown): void {
    console.error('Order Watch WebSocket connection error:', error)
    this.isConnecting = false
  }

  disconnect(): void {
    console.log('🔍 Disconnecting Order Watch WebSocket service...')
    this.isManualDisconnect = true
    
    this.stopHeartbeat()
    this.stopOrderChecking()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.orderWatchSocket) {
      this.orderWatchSocket.disconnect()
      this.orderWatchSocket = null
    }

    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  watchOrder(config: OrderWatchConfig): void {
    console.log(`👀 Starting to watch order: ${config.orderId}`)
    this.watchedOrders.set(config.orderId, config)
    
    if (this.isConnected()) {
      this.orderWatchSocket?.emit('watch_order', config)
    }
  }

  stopWatchingOrder(orderId: string): void {
    console.log(`👁️ Stopping watch for order: ${orderId}`)
    this.watchedOrders.delete(orderId)
    
    if (this.isConnected()) {
      this.orderWatchSocket?.emit('stop_watching_order', { orderId })
    }
  }

  onOrderExecuted(callback: (event: OrderExecutionEvent) => void): void {
    this.orderExecutedCallback = callback
  }

  onStopLossTriggered(callback: (event: StopLossTriggerEvent) => void): void {
    this.stopLossTriggeredCallback = callback
  }

  isConnected(): boolean {
    return this.orderWatchSocket?.connected || false
  }

  getWatchedOrders(): OrderWatchConfig[] {
    const orders = Array.from(this.watchedOrders.values())
    console.log('🔍 getWatchedOrders called, returning:', orders.length, 'orders')
    console.log('🔍 Watched orders details:', orders)
    return orders
  }
}

// Export singleton instance
const orderDataService = new OrderWatchServiceImpl()
export default orderDataService
