'use client'

import { useEffect, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import OrderTable from '../common/OrderTable'

// 🔹 Shimmer Loader
function PositionsShimmer() {
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
function EmptyPositions() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          No Positions Found
        </h3>
        <p className="text-slate-600 text-sm max-w-sm mx-auto">
          You don&apos;t have any active positions right now. Start trading to see them here.
        </p>
      </div>
    </div>
  )
}

export default function PositionBookTab() {
  const { positions, getPositions, loading } = useAPI()

  // 🔹 Fetch positions on mount
  useEffect(() => {
    getPositions()
  }, [getPositions])

  // 🔹 Memoized positions data (optional defensive clone)
  const positionData = useMemo(() => positions || [], [positions])

  // 🔹 Render conditions
  if (loading.positions) return <PositionsShimmer />
  if (!positionData.length) return <EmptyPositions />

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
        <OrderTable data={positionData} type="positionbook" />
      </div>
    </div>
  )
}