import { HistoricalDataRequest, HistoricalDataResponse, OHLCData } from '@/types'

class ChartDataService {

  /**
   * Fetch historical OHLC data for charting
   */
  async fetchHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    try {
      const params = new URLSearchParams({
        token: request.token,
        exchange: request.exchange,
        resolution: request.resolution,
        ...(request.from && { from: request.from.toString() }),
        ...(request.to && { to: request.to.toString() })
      })

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/historical-data?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform the data to match our interface
      return {
        data: data.map((item: Record<string, unknown>) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume || 0
        })),
        symbol: request.token, // This would come from the API response in production
        exchange: request.exchange,
        resolution: request.resolution,
        from: request.from || 0,
        to: request.to || Date.now()
      }
    } catch (error) {
      console.error('Error fetching historical data:', error)
      throw new Error(`Failed to fetch historical data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get default date range for different resolutions
   */
  getDefaultDateRange(resolution: string): { from: number; to: number } {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const threeMonths = 90 * oneDay
    const oneYear = 365 * oneDay

    switch (resolution) {
      case '1':
      case '5':
      case '15':
      case '30':
      case '60':
        return { from: now - oneDay, to: now }
      case 'D':
        return { from: now - threeMonths, to: now }
      case 'W':
        return { from: now - oneYear, to: now }
      case 'M':
        return { from: now - (3 * oneYear), to: now }
      default:
        return { from: now - threeMonths, to: now }
    }
  }

  /**
   * Format time for different resolutions
   */
  formatTime(time: string | number, resolution: string): number {
    if (typeof time === 'number') {
      return time
    }

    const date = new Date(time)
    
    // For intraday resolutions, return timestamp in seconds
    if (['1', '5', '15', '30', '60'].includes(resolution)) {
      return Math.floor(date.getTime() / 1000)
    }
    
    // For daily and above, return timestamp in seconds
    return Math.floor(date.getTime() / 1000)
  }

  /**
   * Validate OHLC data
   */
  validateOHLCData(data: OHLCData[]): boolean {
    return data.every(item => 
      typeof item.open === 'number' &&
      typeof item.high === 'number' &&
      typeof item.low === 'number' &&
      typeof item.close === 'number' &&
      item.high >= Math.max(item.open, item.close) &&
      item.low <= Math.min(item.open, item.close)
    )
  }
}

// Export singleton instance
const chartDataService = new ChartDataService()
export default chartDataService
