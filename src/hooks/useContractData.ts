'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Contract } from '@/types'
import contractWebSocketService from '@/services/contractWebSocketService'

interface UseContractDataOptions {
  autoConnect?: boolean
  enableWebSocket?: boolean
  refreshInterval?: number
  niftyPrice?: number
  maxContracts?: number
  selectedContract?: Contract | null
}

interface UseContractDataReturn {
  contracts: Contract[]
  loading: boolean
  error: string | null
  isConnected: boolean
  refresh: () => Promise<void>
  connect: () => void
  disconnect: () => void
  searchContracts: (query: string) => Contract[]
  hasInitialData: boolean
  selectedContract: Contract | null
  setSelectedContract: (contract: Contract | null) => void
}

export function useContractData({
  enableWebSocket = true,
  refreshInterval = 0,
  niftyPrice = 0,
  maxContracts = 20,
  selectedContract: initialSelectedContract = null,
}: UseContractDataOptions = {}): UseContractDataReturn {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasInitialData, setHasInitialData] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(initialSelectedContract)  

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)  
  const hasInitialized = useRef(false)
  const isFetching = useRef(false)
  const isSubscribed = useRef(false)

  // Debug selectedContract changes
  useEffect(() => {
    console.log('Selected contract state changed:', selectedContract)
  }, [selectedContract])

  /** Fetch contracts from API */
  const fetchContracts = useCallback(async (): Promise<Contract[]> => {
    try {
      const res = await fetch('https://v2api.aliceblueonline.com/restpy/contract_master?exch=NFO')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      const nfoData = Array.isArray(data.NFO) ? data.NFO : data

      const now = new Date()

      const minStrike = niftyPrice - 200
      const maxStrike = niftyPrice + 200

      const formatExpiryToMMYYYY = (date: number | Date): string => {
      const d = typeof date === 'number' ? new Date(date) : date;
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${month}-${year}`;
    };
    
      interface NFOItem {
        token?: string
        symbol: string
        instrument_type: string
        option_type: string
        expiry_date: number
        strike_price: number
        exch?: string
        trading_symbol?: string
        formatted_ins_name?: string
        lot_size?: string
      }

      const niftyContracts = nfoData
        .filter(
          (item: NFOItem) =>
            item.symbol === 'NIFTY' &&
            item.instrument_type === 'OPTIDX' &&
            (item.option_type === 'CE' || item.option_type === 'PE') &&
            // new Date(item.expiry_date) >= startOfWeek &&
            // new Date(item.expiry_date) <= endOfWeek &&
            formatExpiryToMMYYYY(item.expiry_date) === formatExpiryToMMYYYY(new Date(now)) &&
            (!niftyPrice || (item.strike_price >= minStrike && item.strike_price <= maxStrike))
        )
        .map((item: NFOItem, i: number) => ({
          id: item.token || `${item.symbol}_${item.strike_price}_${item.option_type}_${item.expiry_date}_${i}`,
          symbol: item.symbol,
          trading_symbol: item.trading_symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          exchange: item.exch || 'NFO',
          type: item.option_type,
          strike: Number(item.strike_price),
          expiry: new Date(item.expiry_date).toISOString().split('T')[0],
          token: item.token,
          formatted_ins_name: item.formatted_ins_name,
          lot_size: item.lot_size,
          option_type: item.option_type,
          strike_price: item.strike_price,
          expiry_date: item.expiry_date,
        }))
        .sort((a: Contract, b: Contract) => {
          const expiryDiff = new Date(a.expiry_date || 0).getTime() - new Date(b.expiry_date || 0).getTime()
          return expiryDiff || (a.strike || 0) - (b.strike || 0)
        })
        // Remove duplicates based on ID to prevent React key conflicts
        .filter((contract: Contract, index: number, arr: Contract[]) => 
          arr.findIndex(c => c.id === contract.id) === index
        )
        .slice(0, maxContracts)

      return niftyContracts
    } catch (err) {
      throw err
    }
  }, [niftyPrice, maxContracts])

  /** Refresh contracts */
  const refresh = useCallback(async () => {
    if (loading || isFetching.current) return
    isFetching.current = true
    setLoading(true)
    setError(null)

    try {
      const data = await fetchContracts()
      
      console.log(`Fetched ${data.length} contracts`)
      setContracts(data)
      setHasInitialData(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contracts'
      setError(errorMessage)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [fetchContracts, loading])
  
    // WebSocket connection management
    const connect = useCallback(() => {
      if (!enableWebSocket || isConnected) return
      
      console.log('Connecting to Contract data WebSocket...')
      contractWebSocketService.connect()
    }, [enableWebSocket, isConnected])
  
    const disconnect = useCallback(() => {
      if (!enableWebSocket) return
      
      console.log('Disconnecting from Contract data WebSocket...')
      contractWebSocketService.disconnect()
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

  /** WebSocket events */
  useEffect(() => {
    if (!enableWebSocket) return;

    const handleConnect = () => {
      console.log('Contract data WebSocket connected');
      setIsConnected(true);
      setError(null);
      
      // Log current subscription status
      console.log('WebSocket connected - checking for pending subscriptions...');
    };

    const handleDisconnect = () => {
      console.log('Contract data WebSocket disconnected');
      setIsConnected(false);
    };

    const handleError = (error: unknown) => {
      console.error('Contract data WebSocket error:', error);
      const errorMessage = error instanceof Error ? error.message : 'WebSocket connection error'
      setError(errorMessage);
      setIsConnected(false);
    };

    contractWebSocketService.onConnect(handleConnect);
    contractWebSocketService.onDisconnect(handleDisconnect);
    contractWebSocketService.onError(handleError);

    return () => {
      contractWebSocketService.onConnect(() => {})
      contractWebSocketService.onDisconnect(() => {})
      contractWebSocketService.onError(() => {})
    };
  }, [enableWebSocket]);

  // Handle specific contract subscription when selectedContract changes
  useEffect(() => {
    if (!enableWebSocket || !selectedContract?.token) {
      console.log('Contract subscription skipped:', { enableWebSocket, hasToken: !!selectedContract?.token })
      return;
    }

    console.log(`🔄 Setting up subscription for contract token: ${selectedContract.token}`)

    interface ContractUpdate {
      price?: number
      changePercent?: number
    }

    const handleContractUpdates = (data: Record<string, ContractUpdate>) => {
      console.log('Received specific contract updates:', data);
      
      // Only update if we have a selected contract and it has updates
      if (selectedContract?.token && data[selectedContract.token]) {
        const update = data[selectedContract.token]
        console.log(`Updating selected contract ${selectedContract.token}:`, {
          LTP: update.price,
          LTP_Percent: update.changePercent,
          previousLTP: selectedContract.price,
          previousLTP_Percent: selectedContract.changePercent
        });
        
        setSelectedContract(prev => prev ? {
          ...prev,
          price: update.price || prev.price,  // LTP (Last Traded Price)
          changePercent: update.changePercent || prev.changePercent  // LTP% (Last Traded Price percentage)
        } : null)
        
        // Also update the contracts list for the selected contract
        setContracts(prev =>
          prev.map(c =>
            c.token === selectedContract.token && c.token && data[c.token]
              ? { ...c, price: data[c.token].price || c.price, changePercent: data[c.token].changePercent || c.changePercent }
              : c
          )
        )
      } else if (selectedContract?.token) {
        console.log(`No updates found for selected contract token: ${selectedContract.token}`);
      }
    };

    // Subscribe to specific contract
    console.log(`📡 Calling subscribeToSpecificContract for token: ${selectedContract.token}`)
    contractWebSocketService.subscribeToSpecificContract(selectedContract.token, handleContractUpdates);
    isSubscribed.current = true;

    return () => {
      console.log(`📡 Unsubscribing from contract token: ${selectedContract.token}`)
      if (selectedContract?.token) {
        contractWebSocketService.unsubscribeFromSpecificContract(selectedContract.token);
      }
      isSubscribed.current = false;
    };
  }, [enableWebSocket, selectedContract?.token, selectedContract?.price, selectedContract?.changePercent]);

  // Set up refresh interval if specified
    useEffect(() => {
      if (refreshInterval > 0) {
        refreshIntervalRef.current = setInterval(refresh, refreshInterval)
      }
  
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
      }
    }, [refreshInterval, refresh])
  
    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
        if (isSubscribed.current && selectedContract?.token) {
          contractWebSocketService.unsubscribeFromSpecificContract(selectedContract.token)
        }
      }
    }, [selectedContract?.token])

  /** Search contracts */
  const searchContracts = useCallback(
    (query: string): Contract[] =>
      !query.trim()
        ? contracts
        : contracts.filter(
            c =>
              c.trading_symbol?.toLowerCase().includes(query.toLowerCase()) ||
              c.strike_price?.toString().includes(query) ||
              c.option_type?.toLowerCase().includes(query.toLowerCase())
          ),
    [contracts]
  )

  return { 
    contracts, 
    loading, 
    error, 
    isConnected, 
    refresh, 
    connect, 
    disconnect, 
    searchContracts, 
    hasInitialData,
    selectedContract,
    setSelectedContract
  }
}