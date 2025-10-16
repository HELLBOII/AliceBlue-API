'use client'

import { useState, useEffect } from 'react'
import { Contract, ChartConfig } from '@/types'
import LightweightChart from '@/components/common/LightweightChart'

interface ChartTabProps {
  selectedContract?: Contract | null
  interval?: string
  theme?: 'light' | 'dark'
}

export default function ChartTab({
  selectedContract,
  interval = 'D',
  theme = 'light',
}: ChartTabProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update chart config when contract or settings change
  useEffect(() => {
    if (!selectedContract) {
      setChartConfig(null)
      setDataLoaded(false)
      setError(null)
      return
    }

    // Create chart configuration
    const config: ChartConfig = {
      symbol: selectedContract.symbol,
      token: selectedContract.token || selectedContract.id, // Use token if available, fallback to id
      exchange: selectedContract.exchange || selectedContract.exch || 'NSE',
      resolution: interval,
      theme: theme
    }

    setChartConfig(config)
    setDataLoaded(false)
    setError(null)
  }, [selectedContract, interval, theme])

  const handleDataLoad = (data: any[]) => {
    setDataLoaded(true)
    setError(null)
    console.log(`Chart data loaded: ${data.length} data points`)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setDataLoaded(false)
    console.error('Chart error:', errorMessage)
  }

  return (
    <div className="w-full h-full border border-slate-200 rounded-lg min-h-[400px] bg-white dark:bg-gray-900">
      {!selectedContract ? (
        <div className="h-full flex items-center justify-center text-center">
          <div>
            <div className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">
              Select a Contract
            </div>
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              Choose a contract from the list to view its chart
            </p>
          </div>
        </div>
      ) : !chartConfig ? (
        <div className="h-full flex items-center justify-center text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !dataLoaded ? (
        <div className="h-full p-6">
          {/* Chart Header Shimmer */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="shimmer shimmer-delay-0">
                  <div className="h-6 bg-gray-200 rounded w-24 shimmer"></div>
                </div>
                <div className="shimmer shimmer-delay-1">
                  <div className="h-4 bg-gray-200 rounded w-16 shimmer"></div>
                </div>
              </div>
              <div className="shimmer shimmer-delay-2">
                <div className="h-4 bg-gray-200 rounded w-20 shimmer"></div>
              </div>
            </div>
          </div>
          
          {/* Chart Area Shimmer */}
          <div className="shimmer shimmer-delay-3">
            <div className="h-80 bg-gray-200 rounded-lg shimmer"></div>
          </div>
          
          {/* Chart Footer Shimmer */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="shimmer shimmer-delay-4">
                <div className="h-3 bg-gray-200 rounded w-32 shimmer"></div>
              </div>
              <div className="shimmer shimmer-delay-0">
                <div className="h-6 bg-gray-200 rounded w-16 shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full relative">
          {/* Chart Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-gray-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedContract.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedContract.exchange || selectedContract.exch} • {interval}
                  </div>
                </div>
                {selectedContract.price && (
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                      ₹{selectedContract.price.toFixed(2)}
                    </div>
                    {selectedContract.changePercent !== undefined && (
                      <div className={`text-xs font-medium ${
                        selectedContract.changePercent >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {selectedContract.changePercent >= 0 ? '+' : ''}{selectedContract.changePercent.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Chart Controls */}
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {dataLoaded ? 'Live' : 'Loading...'}
                </div>
                {error && (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    Error
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="pt-12 h-full">
            <LightweightChart
              config={chartConfig}
              height={400}
              onDataLoad={handleDataLoad}
              onError={handleError}
            />
          </div>

          {/* Chart Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-gray-700 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>
                Powered by Alice Blue API & Lightweight Charts
              </div>
              <div>
                {selectedContract.type && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {selectedContract.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}