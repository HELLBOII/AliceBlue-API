'use client'

import { useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import OrderTable from '@/components/common/OrderTable'

export default function TradeBookTab() {
  const { tradeBook, getTradeBook, loading } = useAPI()
  
  // Fetch trade book data on component mount
  useEffect(() => {
    getTradeBook()
  }, [getTradeBook])

  return (
    <div className="h-full flex flex-col">
      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
          {loading.tradebook ? (
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
          ) : !Array.isArray(tradeBook) || tradeBook.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Trade Book Entries</h3>
                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                  You don&apos;t have any trade book entries at the moment. Your trade history will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <OrderTable
                  data={tradeBook}
                  type="trade"
                />
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
