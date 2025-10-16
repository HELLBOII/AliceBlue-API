import { useState, useEffect, useCallback } from 'react'
import { Contract, OHLCData, ChartConfig } from '@/types'
import chartDataService from '@/services/chartDataService'

interface UseChartDataOptions {
  contract?: Contract | null
  resolution?: string
  theme?: 'light' | 'dark'
}

interface UseChartDataReturn {
  chartConfig: ChartConfig | null
  data: OHLCData[]
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  updateResolution: (resolution: string) => void
  updateTheme: (theme: 'light' | 'dark') => void
}

export function useChartData({
  contract,
  resolution = 'D',
  theme = 'light'
}: UseChartDataOptions = {}): UseChartDataReturn {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null)
  const [data, setData] = useState<OHLCData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update chart config when contract or settings change
  useEffect(() => {
    if (!contract) {
      setChartConfig(null)
      setData([])
      setError(null)
      return
    }

    const config: ChartConfig = {
      symbol: contract.symbol,
      token: contract.token || contract.id,
      exchange: contract.exchange || contract.exch || 'NSE',
      resolution,
      theme
    }

    setChartConfig(config)
  }, [contract, resolution, theme])

  // Load historical data
  const loadHistoricalData = useCallback(async () => {
    if (!chartConfig) return

    setIsLoading(true)
    setError(null)

    try {
      const dateRange = chartDataService.getDefaultDateRange(resolution)
      
      const response = await chartDataService.fetchHistoricalData({
        token: chartConfig.token,
        exchange: chartConfig.exchange,
        resolution: resolution as '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
        from: dateRange.from,
        to: dateRange.to
      })

      if (!chartDataService.validateOHLCData(response.data)) {
        throw new Error('Invalid OHLC data received')
      }

      setData(response.data)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data'
      setError(errorMessage)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [chartConfig, resolution])

  // Load data when config changes
  useEffect(() => {
    if (chartConfig) {
      loadHistoricalData()
    }
  }, [chartConfig, loadHistoricalData])

  // Update resolution
  const updateResolution = useCallback((newResolution: string) => {
    if (chartConfig) {
      setChartConfig(prev => prev ? { ...prev, resolution: newResolution } : null)
    }
  }, [chartConfig])

  // Update theme
  const updateTheme = useCallback((newTheme: 'light' | 'dark') => {
    if (chartConfig) {
      setChartConfig(prev => prev ? { ...prev, theme: newTheme } : null)
    }
  }, [chartConfig])

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadHistoricalData()
  }, [loadHistoricalData])

  return {
    chartConfig,
    data,
    isLoading,
    error,
    refreshData,
    updateResolution,
    updateTheme
  }
}
