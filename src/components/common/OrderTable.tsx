'use client'

import { Edit, X } from 'lucide-react'
import { getStatusColor, getTransactionTypeColor, formatOrderTime, formatPrice, formatPnl, getOrderDisplayName, getOrderQuantity, getOrderPrice } from '@/utils/orderUtils'
import { useEffect, useMemo } from 'react'
interface OrderTableProps {
  data: any[]
  type: 'pending' | 'executed' | 'trade' | 'positionbook'
  onCancelOrder?: (orderId: string) => void
  onModifyOrder?: (orderId: string) => void
  loading?: boolean
}


export default function OrderTable({ data, type, onCancelOrder, onModifyOrder, loading = false }: OrderTableProps) {
  

  const renderPendingTable = () => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrument</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((order, index) => (
          <tr key={order.id || `pending-order-${index}`} className="hover:bg-gray-50">            
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
              {formatOrderTime(order.OrderedTime)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(order.Trantype)}`}>
                {order.Trantype === 'B' ? 'BUY' : 'SELL'}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
              {getOrderDisplayName(order)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
              {order.Pcode + order.Prctype ? order.Pcode + ' / ' + order.Prctype : 'N/A'}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
              {getOrderQuantity(order)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
              {formatPrice(getOrderPrice(order))}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                <span className={`px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800`}>
                {order.Status.toUpperCase()}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
              <div className='flex items-center space-x-1'>
                {/* Modify Order Button */}
                <div className="relative group">
                  <button 
                    onClick={() => onModifyOrder && onModifyOrder(order.Nstordno || order.id)} 
                    disabled={!onModifyOrder} 
                    aria-label="Modify Order"
                    className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50 disabled:hover:border-blue-200 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
                  >
                    <Edit className='w-4 h-4 text-blue-600' />
                  </button>
                  
                  {/* Tooltip for Modify Button */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    Modify Order
                  </div>
                </div>

                {/* Cancel Order Button */}
                <div className="relative group">
                  <button 
                    onClick={() => onCancelOrder && onCancelOrder(order.Nstordno || order.id)} 
                    disabled={!onCancelOrder} 
                    aria-label="Cancel Order"
                    className="p-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:border-red-200 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
                  >
                    <X className='w-4 h-4 text-red-600' />
                  </button>
                  
                  {/* Tooltip for Cancel Button */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    Cancel Order
                  </div>
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderExecutedTable = () => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Instrument</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Traded Qty</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((order, index)  => (
          <tr key={order.Nstordno || order.orderId || `executed-order-${index}`} className="hover:bg-gray-50">
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              {formatOrderTime(order.OrderedTime)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(order.Trantype)}`}>
                {order.Trantype === 'B' ? 'BUY' : order.Trantype === 'S' ? 'SELL' : order.Trantype || 'N/A'}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              <div className="flex items-center justify-between">
                <span>{getOrderDisplayName(order)}</span>
                <div className="relative group">
                  <button 
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={order.RejReason ? `Rejection reason: ${order.RejReason}` : "More options"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  
                  {(order.RejReason || "More options") && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      {order.RejReason || "More options"}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              {order.Pcode + order.Prctype ? order.Pcode + ' / ' + order.Prctype : 'N/A'}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              {getOrderQuantity(order)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              {order.Fillshares || '0'}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              {order.Trgprc > 0
                ? `${order.Prc} / ${order.Trgprc} trg.` 
                : formatPrice(getOrderPrice(order))}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.Status)}`}>
                {order.Status ? order.Status.toUpperCase() : 'PENDING'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderTradeTable = () => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrument</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Traded Qty</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((trade, index) => {
          return (
            <tr key={trade.nestordernumber || trade.tradeId || `trade-${index}`} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {trade.Filltime}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(trade.Trantype)}`}>
                {trade.Trantype === 'B' ? 'BUY' : trade.Trantype === 'S' ? 'SELL' : trade.Trantype || 'N/A'}
              </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                {trade.Tsym}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                {trade.Pcode + trade.Prctype ? trade.Pcode + ' / ' + trade.Prctype : 'N/A'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                {trade.Qty}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                {trade.Filledqty}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                {trade.Price}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const renderPositionTable = () => (
          <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50">
                  <th className="w-16 text-center py-2 px-2 font-semibold text-slate-700">Type</th>
                  <th className="w-32 text-left py-2 px-3 font-semibold text-slate-700">Symbol</th>
                  <th className="w-16 text-right py-2 px-2 font-semibold text-slate-700">Qty</th>
                  <th className="w-20 text-right py-2 px-2 font-semibold text-slate-700">Buy Avg</th>
                  <th className="w-20 text-right py-2 px-2 font-semibold text-slate-700">Sell Avg</th>
                  <th className="w-20 text-right py-2 px-2 font-semibold text-slate-700">P&L</th>
                </tr>
              </thead>
              <tbody>
                {data.map((position, index) => (
                  <tr key={position.id || `position-${index}`} className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200">
                    <td className="py-2 px-2 text-center">
                      <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-xs font-medium">
                        {position.Pcode}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 truncate">{position.Tsym}</td>
                    <td className="py-2 px-2 text-right font-medium text-slate-600">{position.Netqty}</td>
                    <td className="py-2 px-2 text-right font-medium text-slate-800">{position.Buyavgprc}</td>
                    <td className="py-2 px-2 text-right font-medium text-slate-800">{position.Sellavgprc}</td>
                    <td className="py-2 px-2 text-right text-slate-800">
                      {(() => {
                        const pnl = formatPnl(position.Unrealisedpnl);
                        return typeof pnl === 'string' ? pnl : (
                          <span className={pnl.className}>
                            {pnl.value}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
  )

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto overflow-y-scroll h-[280px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {type === 'pending' && renderPendingTable()}
        {type === 'executed' && renderExecutedTable()}
        {type === 'trade' && renderTradeTable()}
        {type === 'positionbook' && renderPositionTable()}
      </div>
    </div>
  )
}
