'use client'

import { useEffect, useMemo } from 'react'
import { CheckCircle } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { isExecutedStatus } from '@/constants/orderStatuses'
import OrderTable from '@/components/common/OrderTable'
import type { Order } from '@/types'

// --- Shimmer Loader Component ---
function OrdersShimmer() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="grid grid-cols-8 gap-4 h-8 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-8 gap-4 h-8.5 animate-pulse">
          {Array.from({ length: 8 }).map((_, colIndex) => (
            <div key={colIndex} className="bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

// --- Empty State Component ---
function EmptyExecutedOrders() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          No Executed Orders
        </h3>
        <p className="text-slate-600 text-sm max-w-sm mx-auto">
          You don&apos;t have any executed orders at the moment. Your completed trades will appear here.
        </p>
      </div>
    </div>
  )
}

export default function ExecutedOrdersTab() {
  const { orders, getOrders, loading } = useAPI()

  // Fetch once when mounted
  useEffect(() => {
    getOrders()
  }, [getOrders])

  // Memoized executed orders
  const executedOrders = useMemo(() => {
    return orders?.filter((order: Order) => isExecutedStatus(order.Status || '')) || []
  }, [orders])

  // Conditional render logic
  if (loading.orders) return <OrdersShimmer />
  if (!executedOrders.length) return <EmptyExecutedOrders />

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
        <OrderTable data={executedOrders} type="executed" />
      </div>
    </div>
  )
}