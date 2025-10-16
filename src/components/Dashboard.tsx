'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  RefreshCw, 
  Play, 
  Square, 
  Copy, 
  ChevronDown,
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Building2,
  Trash2,
  BookOpen,
  User,
  Clock,
  CheckCircle,
  BarChart,
  Settings
} from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useMarketData } from '@/hooks/useMarketData'
import { useContractData } from '@/hooks/useContractData'
import { OrderForm,Contract } from '@/types'
import PositionBookTab from '@/components/tabs/PositionBookTab'
import AccountDetailsTab from '@/components/tabs/AccountDetailsTab'
import OpenOrdersTab from '@/components/tabs/OpenOrdersTab'
import ExecutedOrdersTab from '@/components/tabs/ExecutedOrdersTab'
import TradeBookTab from '@/components/tabs/TradeBookTab'
import ChartTab from '@/components/tabs/ChartTab'
import SettingsTab from '@/components/tabs/SettingsTab'

interface LogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'error' | 'warning' | 'success'
}

export default function Dashboard() {
  // Helper function to get API URL
  const getApiUrl = (endpoint: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    console.log('🔗 Dashboard API URL Debug:', {
      envVar: process.env.NEXT_PUBLIC_API_BASE_URL,
      baseUrl,
      endpoint,
      finalUrl: url
    })
    return url
  }

  // Order State - declare before hooks
  
  // Use optimized hooks for data management
  const { 
    funds, 
    getPositions, 
    getOrders, 
    getFunds, 
    getProfile,
    getTradeBook
  } = useAPI()
  const { marketData } = useMarketData({
    autoConnect: true,
    enableWebSocket: true
  })
  const { 
    contracts, 
    loading: contractsLoading, 
    refresh: refreshContracts,
    searchContracts,
    selectedContract: hookSelectedContract,
    setSelectedContract: setHookSelectedContract
  } = useContractData({
    niftyPrice: marketData.nifty50.price,
    maxContracts: 80,
    enableWebSocket: true,
    autoConnect: true
  })
  
  const [ltp, setLtp] = useState<number>(0)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [accountMode, setAccountMode] = useState<'primary' | 'all'>('primary')
  const [orderForm, setOrderForm] = useState<OrderForm>({
    exchange: '',
    symbol: '',
    order_type: 'Regular',
    transaction_type: 'B',
    product_type: 'Intraday MIS',
    token: '',
    quantity: 0,
    price: 0,
    trigger_price: 0,
    stop_loss: 0,
    square_off: 0,
    trailing_sl: 0,
    executionType: 'Limit',
    charges: 0,
    requiredMargin: 0,
    availableMargin: 0,
    product: 'MIS',
  })
  
  
  // Contract UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'positionbook' | 'openorders' | 'executedorders' | 'tradebooks' | 'account' | 'settings'>('positionbook')
  const [showChartInMainArea, setShowChartInMainArea] = useState(false)
  
  // Handle tab change with specific API calls
  const handleTabChange = useCallback(async (tab: 'positionbook' | 'openorders' | 'executedorders' | 'tradebooks' | 'account' | 'settings') => {
    setActiveTab(tab)
    setShowChartInMainArea(false) // Hide chart in main area when switching tabs
    
    try {
      switch (tab) {
        case 'positionbook':
          await getPositions()
          break
          
        case 'openorders':
          await getOrders()
          break
          
        case 'executedorders':
          await getOrders() // This will get all orders, executed ones can be filtered
          break
          
        case 'tradebooks':
          await getTradeBook()
          break
          
        case 'account':
          await getProfile()
          // await getFunds() // Also fetch funds when viewing account details
          break
          
        case 'settings':
          // No API call needed for settings tab
          break
          
        default:
          console.log('❓ Unknown tab:', tab)
      }
    } catch {
      // Error handling can be added here if needed
    }
  }, [getPositions, getOrders, getProfile, getTradeBook])

  // Handle chart button click
  const handleChartButtonClick = useCallback(() => {
    setShowChartInMainArea(!showChartInMainArea)
    if (!showChartInMainArea) {
      setActiveTab('positionbook') // Reset to default tab when showing chart
    }
  }, [showChartInMainArea])
  
  // Load initial data for default tab
  useEffect(() => {
    handleTabChange('positionbook')
  }, [handleTabChange]) // Only run once on mount
  
  
  // Helper function for day suffix
  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) {
      return 'th'
    }
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'positionbook':
        return <PositionBookTab />
      case 'openorders':
        return <OpenOrdersTab />
      case 'executedorders':
        return <ExecutedOrdersTab />
      case 'tradebooks':
        return <TradeBookTab />
      case 'account':
        return <AccountDetailsTab />
      case 'settings':
        return <SettingsTab />
      default:
        return null
    }
  }
  
  // Logs - Start with empty array, will be populated by socket events
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  // Order watch event handlers
  // Order execution and stop loss handlers
  useEffect(() => {
    // Order watch functionality removed
  }, [])


  // Filter contracts based on search query using optimized search function
  const filteredContracts = useMemo(() => {
    if (!contracts.length) return []
    
    // Use the optimized search function from the hook
    if (searchQuery) {
      return searchContracts(searchQuery)
    }
    
    return contracts
  }, [contracts, searchQuery, searchContracts])  
  // Calculate today's P&L from positions
  // const todayPnL = positionBookData.reduce((sum, position) => sum + position.pnl, 0)
  // const todayPnLPercent = positionBookData.length > 0 ? 
  //   (todayPnL / positionBookData.reduce((sum, pos) => sum + (pos.averagePrice * pos.quantity), 0)) * 100 : 0

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      type
    }
    setLogs(prev => [newLog, ...prev])
  }

  const clearLogs = () => {
    setLogs([])
    addLog('Console cleared', 'info')
  }

  // Set up WebSocket event listeners for live logs
  useEffect(() => {
    // Add initial connection log
    // addLog('Initializing WebSocket connections...', 'info')
  }, [])

  const handlePlaceOrders = async () => {
    // Validation
    if (!hookSelectedContract) {
      addLog('Please select a contract', 'error')
      return
    }

    if (!orderForm.quantity || orderForm.quantity <= 0) {
      addLog('Please enter a valid quantity', 'error')
      return
    }

    if (orderType === 'limit' && (!orderForm.price || orderForm.price <= 0)) {
      addLog('Please enter a valid limit price', 'error')
      return
    }

    try {
      const accountModeText = accountMode === 'primary' ? 'Primary Account' : 'All Connected Accounts'
      addLog(`Placing ${orderType} order for ${hookSelectedContract.trading_symbol} on ${accountModeText}...`, 'info')
      
      // Simplified order data - only essential parameters
      const orderData = {
        exchange: orderForm.exchange || 'NFO',
        trading_symbol: orderForm.symbol || '',
        quantity: orderForm.quantity,
        price: orderType === 'market' ? 0 : orderForm.price,
        executionType: orderType === 'market' ? 'Market' : orderForm.executionType,
        product_type: orderForm.product_type,
        transaction_type: orderForm.transaction_type,
        account_mode: accountMode // Add account mode to order data
      }

      // Call the appropriate API endpoint based on account mode
      const endpoint = accountMode === 'primary' 
        ? getApiUrl('/place-order-primary')
        : getApiUrl('/place-order-all')
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (result.success) {
        if (accountMode === 'primary') {
          addLog(`Order placed successfully on Primary Account: ${orderType} order for ${hookSelectedContract.trading_symbol}`, 'success')
          addLog(`Order ID: ${result.order_id || 'N/A'}`, 'info')
          
          // Log stop loss order if placed
          if (result.stop_loss_orders && result.stop_loss_orders.length > 0) {
            const stopLossOrder = result.stop_loss_orders[0]
            if (stopLossOrder.order_id) {
              addLog(`Stop Loss Order placed: ID ${stopLossOrder.order_id} at ₹${stopLossOrder.stop_loss_price}`, 'success')
            } else if (stopLossOrder.error) {
              addLog(`Stop Loss Order failed: ${stopLossOrder.error}`, 'warning')
            }
          }
          
          // Handle order watch for limit orders
          if (result.order_watch && result.order_watch.enabled) {
            addLog(`Order watch enabled: ${result.order_watch.message}`, 'info')
          }
          
          // Auto-watch the placed order if it's a limit order
          if (orderType === 'limit' && result.order_id && hookSelectedContract && hookSelectedContract.trading_symbol) {
            // Order watch functionality removed
          }
        } else {
          addLog(`Orders placed successfully on All Accounts: ${orderType} order for ${hookSelectedContract.trading_symbol}`, 'success')
          if (result.order_ids && result.order_ids.length > 0) {
            addLog(`Order IDs: ${result.order_ids.join(', ')}`, 'info')
          }
          
          // Log stop loss orders if placed
          if (result.stop_loss_orders && result.stop_loss_orders.length > 0) {
            addLog(`Stop Loss Orders placed:`, 'success')
            result.stop_loss_orders.forEach((stopLossOrder: Record<string, unknown>) => {
              if (stopLossOrder.order_id) {
                addLog(`  ${stopLossOrder.account_name}: ID ${stopLossOrder.order_id} at ₹${stopLossOrder.stop_loss_price}`, 'info')
              } else if (stopLossOrder.error) {
                addLog(`  ${stopLossOrder.account_name}: Stop Loss failed - ${stopLossOrder.error}`, 'warning')
              }
            })
          }
          
          // Auto-watch placed orders for all accounts if they are limit orders
          if (orderType === 'limit' && result.order_ids && result.order_ids.length > 0 && hookSelectedContract && hookSelectedContract.trading_symbol) {
            result.order_ids.forEach(() => {
              // Order watch functionality removed
            })
          }
        }
        
        // Reset form
        setOrderForm(prev => ({
          ...prev,
          quantity: hookSelectedContract?.lot_size ? parseInt(hookSelectedContract.lot_size) : 1,
          // price: hookSelectedContract?.price || 0,
          trigger_price: 0,
          stop_loss: 0
        }))
        setOrderType('market')

      } else {
        const errorMsg = result.message || result.error || 'Unknown error occurred'
        addLog(`Order failed: ${errorMsg}`, 'error')
        
        // Log detailed error information
        if (result.failed_orders && result.failed_orders.length > 0) {
          addLog(`Failed orders details:`, 'error')
          result.failed_orders.forEach((failed: Record<string, unknown>) => {
            addLog(`  ${failed.account_name}: ${failed.error}`, 'error')
          })
        }
        
        // Log debug information
        if (result.debug_info) {
          addLog(`Debug: ${result.debug_info.total_accounts} accounts, ${result.debug_info.successful_count} successful, ${result.debug_info.failed_count} failed`, 'info')
        }
      }
      
    } catch (error) {
      addLog(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const handleSquareOff = async () => {
    try {
      const accountModeText = accountMode === 'primary' ? 'Primary Account' : 'All Connected Accounts'
      addLog(`🚀 Initiating comprehensive square off on ${accountModeText}...`, 'info')
      
      // Call the comprehensive square off API
      const response = await fetch(getApiUrl('/comprehensive-square-off'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_mode: accountMode
        }),
      })

      const result = await response.json()

      console.log('🔍 Square-off API Response:', result)
      console.log('🔍 Response Steps:', result.steps)
      console.log('🔍 Response Summary:', result.summary)

      if (result.success) {
        addLog(`✅ Comprehensive square off completed successfully!`, 'success')
        
        // Log step-by-step results
        const steps = result.steps || {}
        const summary = result.summary || {}
        
        console.log('🔍 Processing steps:', steps)
        
        // Step 1: Cancel Orders
        if (steps.step1_cancel_orders) {
          addLog(`📋 Step 1 - Cancel Orders: ${steps.step1_cancel_orders.message}`, 'info')
          if (steps.step1_cancel_orders.details && steps.step1_cancel_orders.details.length > 0) {
            steps.step1_cancel_orders.details.forEach((order: Record<string, unknown>) => {
              addLog(`  ✅ Cancelled: ${order.symbol} - Order ID: ${order.order_id}`, 'info')
            })
          }
        }
        
        // Step 2: Auto Square Off
        if (steps.step2_auto_square_off) {
          addLog(`🔄 Step 2 - Auto Square Off: ${steps.step2_auto_square_off.message}`, 'info')
          if (steps.step2_auto_square_off.details && steps.step2_auto_square_off.details.length > 0) {
            steps.step2_auto_square_off.details.forEach((position: Record<string, unknown>) => {
              addLog(`  ✅ Squared off: ${position.symbol} - ${position.quantity} qty - Order ID: ${position.order_id}`, 'info')
            })
          }
        }
        
        // Summary
        if (summary) {
          addLog(`📊 Summary: ${summary.orders_cancelled || 0} orders cancelled, ${summary.positions_squared_off || 0} positions squared off`, 'success')
        }
        
        // Refresh positions and funds
        await getPositions()
        await getFunds()
        addLog('🔄 Portfolio data refreshed', 'info')

        
      } else {
        console.log('❌ Square-off failed:', result)
        const errorMsg = result.message || result.error || 'Unknown error occurred'
        addLog(`Comprehensive squareoff : ${errorMsg}`, 'error')
        
        // Log step-by-step failures
        if (result.steps) {
          console.log('🔍 Showing failed step results:', result.steps)
          const steps = result.steps
          
          if (steps.step1_cancel_orders) {
            addLog(`📋 Step 1 - Cancel Orders: ${steps.step1_cancel_orders.message}`, steps.step1_cancel_orders.success ? 'success' : 'error')
          }
          if (steps.step2_auto_square_off) {
            addLog(`🔄 Step 2 - Auto Square Off: ${steps.step2_auto_square_off.message}`, steps.step2_auto_square_off.success ? 'success' : 'error')
          }
        }
      }
      
    } catch (error) {
      addLog(`💥 Failed to execute comprehensive square off: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const handleCopyOrders = () => {
    addLog('Copying orders...', 'info')
  }

  // Manual refresh function for funds
  const handleRefreshFunds = useCallback(async () => {
    try {
      addLog('Refreshing funds data...', 'info')
      await getFunds()
      addLog('✅ Funds data refreshed successfully', 'success')
    } catch (error) {
      addLog(`❌ Failed to refresh funds: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }, [getFunds])

  // Debounced refresh function to prevent multiple rapid clicks
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleRefreshContracts = async () => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Add a small delay to prevent rapid clicking
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        addLog('Starting contract sync...', 'info')
        await refreshContracts()
        addLog(`✅ Synced ${contracts.length} contracts successfully`, 'success')
      } catch (error) {
        addLog(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    }, 100) // 100ms debounce
  }
  // Enhanced contract selection with auto-selection logic
  const handleContractSelect = (contract: Contract) => {
    setHookSelectedContract(contract) // Update hook's selected contract for real-time subscription
    setLtp(contract.price > 0 ? contract.price : 0)
    addLog(`Selected contract: ${contract.trading_symbol} - Real-time data subscription activated`, 'info')
  }

  // Handle contract deselection
  const handleContractDeselect = () => {
    setHookSelectedContract(null) // Clear hook's selected contract to stop real-time subscription
    setLtp(0)
    setOrderForm(prev => ({
      ...prev,
      quantity: 0
    }))
    addLog('Contract deselected - Real-time data subscription stopped', 'info')
  }

  // Fetch positions and funds on component mount
  useEffect(() => {
    addLog('Initializing Dashboard - Fetching positions and funds...', 'info')
    getPositions()
    getFunds() // Add funds fetch on initial load
  }, [getPositions, getFunds])

  
  const fundsData = funds && funds.length > 0 ? funds[0] : null

  // Update selected contract with live data when contracts array updates
  useEffect(() => {
    if (hookSelectedContract && contracts.length > 0) {
      const updatedContract = contracts.find(contract => 
        contract.token === hookSelectedContract.token || 
        contract.id === hookSelectedContract.id
      )
      
      if (updatedContract && updatedContract.price !== hookSelectedContract.price) {
        setHookSelectedContract(updatedContract)
      }
    }
  }, [contracts, hookSelectedContract, setHookSelectedContract])

  // Update orderForm when selected contract changes (only initial setup, not real-time updates)
  useEffect(() => {
    if (hookSelectedContract) {
      const initialQuantity = hookSelectedContract.lot_size ? parseInt(hookSelectedContract.lot_size) : 1
      setOrderForm(prev => ({
        ...prev,
        exchange: hookSelectedContract.exchange || '',
        symbol: hookSelectedContract.trading_symbol || '',
        token: hookSelectedContract.token || '',
        quantity: initialQuantity,
        // Don't set price here to prevent real-time updates
      }))
    }
  }, [hookSelectedContract?.token, hookSelectedContract?.exchange, hookSelectedContract?.trading_symbol, hookSelectedContract?.lot_size, hookSelectedContract])

  // Separate effect to handle real-time price updates for LTP display only
  useEffect(() => {
    if (hookSelectedContract && hookSelectedContract.price > 0) {
      setLtp(hookSelectedContract.price)
      // Don't update orderForm.price here to prevent real-time updates to user input
    }
  }, [hookSelectedContract?.price, hookSelectedContract])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])


  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 p-1 overflow-hidden">
      <div className="grid grid-cols-12 gap-1 h-full min-h-0 max-h-screen">
        
        {/* Left Panel - Auto Trade & Order Placement */}
        <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl shadow-lg border border-slate-200 p-2 backdrop-blur-sm flex flex-col h-full overflow-hidden">
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            
            {/* NIFTY Cards */}
            <div className="grid grid-cols-2 gap-1">
              {/* NIFTY 50 Display */}
              <div className={`rounded-xl border p-3 backdrop-blur-sm ${
                marketData.nifty50.changePercent >= 0 
                  ? 'bg-gradient-to-br from-green-100 via-green-100 to-emerald-50 border-green-200' 
                  : 'bg-gradient-to-br from-red-100 via-red-100 to-pink-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="w-3 h-3 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-800">NIFTY 50</h3>
                  </div>
                  <div className={`text-xs font-medium ${marketData.nifty50.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketData.nifty50.changePercent >= 0 ? '+' : ''}{marketData.nifty50.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${marketData.nifty50.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketData.nifty50.price.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* NIFTY Bank Display */}
              <div className={`rounded-xl border p-3 backdrop-blur-sm ${
                marketData.niftyBank.changePercent >= 0 
                  ? 'bg-gradient-to-br from-green-100 via-green-100 to-emerald-50 border-green-200' 
                  : 'bg-gradient-to-br from-red-100 via-red-100 to-pink-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-1">
                    <Building2 className="w-3 h-3 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-800">NIFTY Bank</h3>
                  </div>
                  <div className={`text-xs font-medium ${marketData.niftyBank.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketData.niftyBank.changePercent >= 0 ? '+' : ''}{marketData.niftyBank.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${marketData.niftyBank.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {marketData.niftyBank.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Today's P&L and Opening Balance Row */}
            <div className="grid grid-cols-2 gap-1">
              {/* Today's P&L */}
              {/* <div className="bg-gradient-to-br from-violet-100 via-violet-100 to-violet-50 rounded-xl border border-violet-200 p-3 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-violet-600" />
                    <h3 className="text-xs font-bold text-slate-800">Today&apos;s P&L</h3>
                  </div>
                  <div className={`text-xs font-medium ${todayPnLPercent >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
                    {todayPnLPercent >= 0 ? '+' : ''}{todayPnLPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${todayPnL >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
                    ₹{todayPnL.toFixed(2)}
                  </div>
                </div>
              </div> */}
              
              <div className="bg-gradient-to-br from-violet-100 via-violet-100 to-violet-50 rounded-xl border border-violet-200 p-3 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-violet-600" />
                    <h3 className="text-xs font-bold text-slate-800">Today&apos;s P&L</h3>
                  </div>
                  <div className="text-xs font-medium text-violet-600">
                    0%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-violet-600">
                    ₹0
                  </div>
                </div>
              </div>

              {/* Opening Balance */}
              <div className="bg-gradient-to-br from-blue-100 via-blue-100 to-indigo-50 rounded-xl border border-blue-200 p-3 backdrop-blur-sm">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Wallet className="w-3 h-3 text-blue-600" />
                      <h3 className="text-xs font-bold text-slate-800">Opening Balance</h3>
                    </div>
                    <button
                      onClick={handleRefreshFunds}
                      className="p-1 hover:bg-blue-200 rounded transition-colors duration-200"
                      title="Refresh funds data"
                    >
                      <RefreshCw className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">
                    ₹{Number(fundsData?.cashmarginavailable || 0).toFixed(2)}
                    {/* {loading.funds ? (
                      <div className="animate-pulse bg-blue-200 h-6 rounded"></div>
                    ) : funds.length > 0 ? (
                      `₹${Number(funds[0].net || 0).toFixed(2)}`
                    ) : (
                      '₹0.00'
                    )} */}
                  </div>
                </div>
              </div>
            </div>

            {/* Available Margin and Margin Used Row */}
            <div className="grid grid-cols-2 gap-1">
              {/* Available Margin */}
              <div className="bg-gradient-to-br from-pink-100 via-pink-100 to-pink-50 rounded-xl border border-pink-200 p-3 backdrop-blur-sm">
                <div className="mb-2">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-pink-600" />
                    <h3 className="text-xs font-bold text-slate-800">Available Margin</h3>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-pink-600">
                    ₹{Number(fundsData?.net || 0).toFixed(2)}
                    {/* {loading.funds ? (
                      <div className="animate-pulse bg-pink-200 h-6 rounded"></div>
                    ) : funds.length > 0 ? (
                      `₹${Number(funds[0].cashmarginavailable || 0).toFixed(2)}`
                    ) : (
                      '₹0.00'
                    )} */}
                  </div>
                </div>
              </div>

              {/* Margin Used */}
              <div className="bg-gradient-to-br from-orange-100 via-orange-100 to-red-50 rounded-xl border border-orange-200 p-3 backdrop-blur-sm">
                <div className="mb-2">
                  <div className="flex items-center space-x-1">
                    <TrendingDown className="w-3 h-3 text-orange-600" />
                    <h3 className="text-xs font-bold text-slate-800">Margin Used</h3>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    ₹{Number(fundsData?.cncMarginUsed || 0).toFixed(2)}
                    {/* {loading.funds ? (
                      <div className="animate-pulse bg-orange-200 h-6 rounded"></div>
                    ) : funds.length > 0 ? (
                      `₹${Number(funds[0].cncMarginUsed || 0).toFixed(2)}`
                    ) : (
                      '₹0.00'
                    )} */}
                  </div>
                </div>
              </div>
            </div>


            {/* Available Contracts */}
            <div className="flex-shrink-0">
                  <div className="relative dropdown-container">
                {/* Custom Dropdown Button */}
                <div className="flex items-center space-x-1 w-full">
                    {/* Dropdown Button */}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={contractsLoading}
                      className="flex-1 px-2 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-all duration-200 flex items-center justify-between text-left"
                    >
                      <span className={hookSelectedContract ? 'text-gray-900' : 'text-gray-500'}>
                        {hookSelectedContract 
                          ? `${hookSelectedContract.symbol} ${new Date(hookSelectedContract.expiry).getDate()}${getDaySuffix(
                              new Date(hookSelectedContract.expiry).getDate()
                            )} ${new Date(hookSelectedContract.expiry).toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${hookSelectedContract.strike} ${hookSelectedContract.option_type}`
                          : 'Select contract...'
                        }
                      </span>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    {/* Chart Button */}
                    <button
                      type="button"
                      onClick={handleChartButtonClick}
                      disabled={!hookSelectedContract}
                      className={`px-2 py-2 text-white rounded-md flex items-center justify-center min-w-[32px] ${
                        showChartInMainArea 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-green-500 hover:bg-green-600'
                      } disabled:bg-gray-300`}
                      aria-label="Toggle chart in main area"
                      title="Toggle chart display in main content area"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>

                    {/* Clear Button */}
                    {hookSelectedContract && (
                      <button
                        type="button"
                        onClick={handleContractDeselect}
                        className="px-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center min-w-[32px]"
                        aria-label="Clear selected contract"
                        title="Clear selected contract"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Refresh Button */}
                    <button
                      type="button"
                      onClick={handleRefreshContracts}
                      disabled={contractsLoading}
                      className="px-2 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-md flex items-center justify-center min-w-[32px]"
                      aria-label="Refresh contracts"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>


                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
                      
                    {/* Search Input */}
                      {/* <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search contracts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      </div> */}
                    
                    {/* Contracts List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredContracts.length > 0 ? (
                        filteredContracts.map((contract) => (
                          <button
                            key={contract.id}
                            type="button"
                            onClick={() => {
                              handleContractSelect(contract)
                              setIsDropdownOpen(false)
                              setSearchQuery('')
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                          >
                            <div className="font-medium text-gray-900">
                              {`${contract.symbol} ${new Date(contract.expiry).getDate()}${getDaySuffix(
                                new Date(contract.expiry).getDate()
                              )} ${new Date(contract.expiry).toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${contract.strike} ${contract.option_type}`}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {contractsLoading ? 'Loading contracts...' : 
                           searchQuery ? 'No contracts found matching your search' : 
                            'No contracts available. Click refresh to sync contracts.'}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
              
              {/* LTP Display */}
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-800 mb-1 font-bold">LTP <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  value={ltp}
                  readOnly
                      className={`w-full px-2 py-1 border rounded text-sm focus:outline-none text-gray-600 bg-gray-200 border-gray-300`}
                      placeholder="0.00"
                      step="0.05"
                      min="0"
                    />
                  </div>
                    <div>
                      <label className="block text-xs text-gray-800 mb-1 font-bold">LTP(%) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      value={hookSelectedContract?.changePercent !== undefined ? hookSelectedContract.changePercent : 0}
                      readOnly
                      className={`w-full px-2 py-1 border rounded text-sm focus:outline-none text-gray-600 bg-gray-200 border-gray-300`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Type */}
            <div className="flex-shrink-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      name="orderType" 
                      value="market"
                      checked={orderType === 'market'}
                      onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                      className="mr-2"
                      aria-label="Market Order"
                    />
                    <span className="text-sm text-gray-700">Market Order</span>
                  </div>
                  </label>
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Limit Qty:</span>
                    <input 
                         type="number"
                         value={orderForm.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setOrderForm(prev => ({ ...prev, quantity: Math.max(0, value) }));
                          }}
                         className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none"
                         placeholder="Qty"
                         step={hookSelectedContract?.lot_size ?? 1}
                         min={hookSelectedContract?.lot_size ?? 1}
                    />


                  </div>
                </label>
                </div>


                <div className="flex items-center justify-between">
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      name="orderType" 
                      value="limit"
                      checked={orderType === 'limit'}
                      onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                      className="mr-2"
                      aria-label="Limit Order"
                    />
                    <span className="text-sm text-gray-700">Limit Order</span>
                  </div>
                  </label>
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Limit Price: {orderType === 'limit' && <span className="text-red-500">*</span>}</span>
                    <input 
                      type="number" 
                      onChange={(e) => setOrderForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className={`w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none ${
                        orderType === 'market' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-900'
                      }`}
                      placeholder="Price"
                      readOnly={orderType === 'market'}
                      step="1"
                      min="0"
                      required={orderType === 'limit'}
                    />
                  </div>
                </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      name="accountMode" 
                      value="primary"
                      checked={accountMode === 'primary'}
                      onChange={(e) => setAccountMode(e.target.value as 'primary' | 'all')}
                      className="mr-2"
                      aria-label="Primary Account"
                    />
                    <span className="text-sm text-gray-700">Primary Account</span>
                  </div>
                  </label>
                  <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      name="accountMode" 
                      value="all"
                      checked={accountMode === 'all'}
                      onChange={(e) => setAccountMode(e.target.value as 'primary' | 'all')}
                      className="mr-2"
                      aria-label="All Connected Accounts"
                    />
                    <span className="text-sm text-gray-700">All Accounts</span>
                  </div>
                  </label>
                </div>
              </div>
            </div>


            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-1 flex-shrink-0">
              <button 
                onClick={handlePlaceOrders}
                className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white py-2 px-1 rounded-lg hover:shadow-lg transition-all duration-300 text-xs font-medium flex items-center justify-center space-x-1"
              >
                <Play className="w-3 h-3" />
                <span>Place Order</span>
              </button>
              <button 
                onClick={handleSquareOff}
                className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white py-2 px-1 rounded-lg hover:shadow-lg transition-all duration-300 text-xs font-medium flex items-center justify-center space-x-1"
              >
                <Square className="w-3 h-3" />
                <span>Square Order</span>
              </button>
              <button 
                onClick={handleCopyOrders}
                className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white py-2 px-1 rounded-lg hover:shadow-lg transition-all duration-300 text-xs font-medium flex items-center justify-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Order</span>
              </button>
            </div>

          </div>
        </div>

        {/* Main Content Area - Grid Layout */}
        <div className={`col-span-12 lg:col-span-9 h-full min-h-0 ${showChartInMainArea ? 'flex flex-col' : 'grid grid-rows-[1fr_1fr] gap-1'}`}>
          
          {/* Full Chart View */}
          {showChartInMainArea ? (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl shadow-lg border border-slate-200 p-3 backdrop-blur-sm flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0">
                <ChartTab selectedContract={hookSelectedContract} />
              </div>
            </div>
          ) : (
            <>
              {/* Top Section - Tabbed Interface */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl shadow-lg border border-slate-200 p-3 backdrop-blur-sm flex flex-col min-h-0">

            {/* Tab Buttons */}
            <div className="flex space-x-1 mb-2 flex-shrink-0">
              <button
                onClick={() => handleTabChange('positionbook')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'positionbook'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Position Book</span>
              </button>
              
              <button
                onClick={() => handleTabChange('openorders')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'openorders'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Open Orders</span>
              </button>
              
              <button
                onClick={() => handleTabChange('executedorders')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'executedorders'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Executed Orders</span>
              </button>
              
              <button
                onClick={() => handleTabChange('tradebooks')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'tradebooks'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <BarChart className="w-3.5 h-3.5" />
                <span>Trade Books</span>
              </button>
              
              <button
                onClick={() => handleTabChange('account')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'account'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Account Details</span>
              </button>
              
              <button
                onClick={() => handleTabChange('settings')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {renderTabContent()}
            </div>
          </div>

          {/* Bottom Section - Log Console */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl shadow-lg border border-slate-200 p-4 backdrop-blur-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-gray-500 via-gray-600 to-slate-600 rounded-lg shadow-md">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Log Console</h3>
              </div>
              <button
                onClick={clearLogs}
                className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-1"
                title="Clear console history"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
            <div className="text-green-400 p-2 rounded-xl flex-1 overflow-hidden text-xs min-h-0">
              <div className="h-full overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="mb-2 flex items-start space-x-2">
                    <span className="text-gray-500 text-xs flex-shrink-0 font-bold">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`flex-1 font-bold ${
                      log.type === 'error' ? 'text-red-800' :
                      log.type === 'warning' ? 'text-yellow-800' :
                      log.type === 'success' ? 'text-green-800' :
                      'text-blue-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
