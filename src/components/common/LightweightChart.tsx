'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts'
import { OHLCData, ChartConfig } from '@/types'
import chartDataService from '@/services/chartDataService'

interface LightweightChartProps {
  config: ChartConfig
  height?: number
  width?: number
  onDataLoad?: (data: OHLCData[]) => void
  onError?: (error: string) => void
}

export default function LightweightChart({
  config,
  height = 400,
  width,
  onDataLoad,
  onError
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OHLCData[]>([])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: config.theme === 'dark' ? '#131722' : '#ffffff' },
        textColor: config.theme === 'dark' ? '#d1d4dc' : '#191919',
      },
      grid: {
        vertLines: { color: config.theme === 'dark' ? 'rgba(42, 46, 57, 0.5)' : 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: config.theme === 'dark' ? 'rgba(42, 46, 57, 0.5)' : 'rgba(197, 203, 206, 0.5)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: config.theme === 'dark' ? 'rgba(197, 203, 206, 0.5)' : 'rgba(197, 203, 206, 0.5)',
      },
      timeScale: {
        borderColor: config.theme === 'dark' ? 'rgba(197, 203, 206, 0.5)' : 'rgba(197, 203, 206, 0.5)',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: width || chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chart) {
        chart.remove()
      }
    }
  }, [config.theme, height, width])

  // Load historical data
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!config.token || !config.exchange) return

      setIsLoading(true)
      setError(null)

      try {
        // Get default date range based on resolution
        const dateRange = chartDataService.getDefaultDateRange(config.resolution)
        
        // Fetch historical data
        const response = await chartDataService.fetchHistoricalData({
          token: config.token,
          exchange: config.exchange,
          resolution: config.resolution as any,
          from: dateRange.from,
          to: dateRange.to
        })

        // Validate data
        if (!chartDataService.validateOHLCData(response.data)) {
          throw new Error('Invalid OHLC data received')
        }

        // Transform data for Lightweight Charts
        const chartData: CandlestickData[] = response.data.map(item => ({
          time: chartDataService.formatTime(item.time, config.resolution) as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))

        // Set data to series
        if (seriesRef.current) {
          seriesRef.current.setData(chartData)
        }

        setData(response.data)
        onDataLoad?.(response.data)
        setIsLoading(false)

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data'
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
      }
    }

    loadHistoricalData()
  }, [config.token, config.exchange, config.resolution])

  return (
    <div className="w-full h-full relative">
      <div
        ref={chartContainerRef}
        className="w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Loading chart data...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">
              Chart Error
            </div>
            <div className="text-red-500 dark:text-red-300 text-xs">
              {error}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-sm font-medium mb-1">No Data Available</div>
            <div className="text-xs">Select a contract to view chart</div>
          </div>
        </div>
      )}
    </div>
  )
}
