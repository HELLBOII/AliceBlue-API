'use client'

import { useEffect, useMemo, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { isPendingStatus } from '@/constants/orderStatuses'
import OrderTable from '@/components/common/OrderTable'
import type { Order } from '@/types'

// 🔹 Shimmer Loader
function OrdersShimmer() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 animate-pulse">
      {[...Array(5)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-8 gap-4 h-8">
          {[...Array(8)].map((_, colIndex) => (
            <div key={colIndex} className="bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

// 🔹 Empty State
function EmptyOpenOrders() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Open Orders</h3>
        <p className="text-slate-600 text-sm max-w-sm mx-auto">
          You don&apos;t have any pending orders right now. Place an order to see it here.
        </p>
      </div>
    </div>
  )
}

export default function OpenOrdersTab() {
  const { orders, getOrders, loading, cancelOrder } = useAPI()

  // 🔹 Fetch on mount
  useEffect(() => {
    getOrders()
  }, [getOrders])

  // 🔹 Memoized pending orders
  const pendingOrders = useMemo(
    () => orders?.filter((o: Order) => isPendingStatus(o.Status || '')) || [],
    [orders]
  )

  // 🔹 Cancel Order
  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const result = await cancelOrder(orderId)
        if (result.success) {
          await getOrders() // refresh list
          console.log('Order cancelled successfully')
        } else {
          console.error('Failed to cancel order:', result.error)
        }
      } catch (error) {
        console.error('Error cancelling order:', error)
      }
    },
    [cancelOrder, getOrders]
  )

  // 🔹 Modify Order
  const handleModifyOrder = useCallback((orderId: string) => {
    console.log('Modify order:', orderId)
    // TODO: Add modify logic here
  }, [])

  // 🔹 Render states
  if (loading.orders) return <OrdersShimmer />
  if (!pendingOrders.length) return <EmptyOpenOrders />

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
        <OrderTable
          data={pendingOrders}
          type="pending"
          onCancelOrder={handleCancelOrder}
          onModifyOrder={handleModifyOrder}
        />
      </div>
    </div>
  )
}