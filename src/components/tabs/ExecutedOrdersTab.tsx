'use client'

import { useEffect, useMemo } from 'react'
import { Order } from '@/types'
import { CheckCircle } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import OrderTable from '@/components/common/OrderTable'
import EmptyState from '@/components/common/EmptyState'
import { isExecutedStatus } from '@/constants/orderStatuses'

export default function ExecutedOrdersTab() {
  const { orders, getOrders, loading, errors } = useAPI()
  
  // Fetch orders on component mount
  useEffect(() => {
    getOrders()
  }, [getOrders])
  
  // Optimized filter for executed orders using centralized constants
  const executedOrders = useMemo(() => {
    if (!orders?.length) return []
    
    return orders.filter((order: Order) => {
      const status = order.status || order.Status || ''
      return isExecutedStatus(status)
    })
  }, [orders])
  
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
          ) : !Array.isArray(executedOrders) || executedOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Executed Orders</h3>
                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                  You don't have any executed orders at the moment. Your completed trades will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <OrderTable
                data={executedOrders}
                type="executed"
              />
            </div>
          )}
      </div>
    </div>
  )
}
