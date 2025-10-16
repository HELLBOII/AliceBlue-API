'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { Order } from '@/types'
import { Clock } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { refreshAfterOrderCancellation } from '@/utils/portfolioRefresh'
import OrderTable from '@/components/common/OrderTable'
import EmptyState from '@/components/common/EmptyState'
import { isPendingStatus } from '@/constants/orderStatuses'

export default function OpenOrdersTab() {
  const { orders, getOrders, loading, cancelOrder } = useAPI()
  
  // Fetch orders on component mount
  useEffect(() => {
    getOrders()
  }, [getOrders])
  
  // Portfolio refresh functions
  const { refreshFunds, refreshPositions, refreshHoldings } = usePortfolioData()
  
  // Optimized filter for pending orders using centralized constants
  const pendingOrders = useMemo(() => {
    if (!orders?.length) return []
    
    return orders.filter((order: Order) => {
      const status = order.Status || ''
      return isPendingStatus(status)
    })
  }, [orders])
  
  
  // Handle cancel order
  const handleCancelOrder = useCallback(async (orderId: string) => {
    try {
      const result = await cancelOrder(orderId)
      
      if (result.success) {
        // Refresh orders from API after successful cancellation
        await getOrders()
        
        // Refresh portfolio data after successful order cancellation
        await refreshAfterOrderCancellation({
          refreshFunds,
          refreshPositions,
          refreshHoldings
        }, {
          refreshFunds: true,
          refreshPositions: true,
          refreshHoldings: false,
          delay: 1000 // Wait 1 second for cancellation to be processed
        })
        
        // Optional: Show success message (you can implement toast notifications here)
        console.log('Order cancelled successfully')
      } else {
        console.error('Failed to cancel order:', result.error)
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
    }
  }, [cancelOrder, getOrders, refreshFunds, refreshPositions, refreshHoldings])
  
  // Handle modify order
  const handleModifyOrder = useCallback(async (orderId: string) => {
    try {
      // TODO: Implement modify order functionality
      console.log('Modify order:', orderId)
      // You can implement the modify order logic here
    } catch (error) {
      console.error('Error modifying order:', error)
    }
  }, [])
  
  return (
    <div className="h-full flex flex-col">
      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
          {loading.orders ? (
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Table Header Shimmer */}
                <div className="shimmer shimmer-delay-0">
                  <div className="grid grid-cols-8 gap-4 h-8">
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                    <div className="bg-gray-200 rounded shimmer"></div>
                  </div>
                </div>
                
                {/* Table Rows Shimmer */}
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={`shimmer shimmer-delay-${index + 1}`}>
                    <div className="grid grid-cols-8 gap-4 h-8.5">
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                      <div className="bg-gray-200 rounded shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !Array.isArray(pendingOrders) || pendingOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Open Orders</h3>
                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                  You don't have any pending orders at the moment. Place an order to see it here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <OrderTable
                  data={pendingOrders}
                  type="pending"
                  onCancelOrder={handleCancelOrder}
                  onModifyOrder={handleModifyOrder}
                />
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
