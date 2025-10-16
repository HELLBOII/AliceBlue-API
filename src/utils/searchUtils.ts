/**
 * Utility functions for search and filtering
 */

export const createSearchFilter = (searchTerm: string) => {
  const searchLower = searchTerm.toLowerCase()
  
  return {
    pendingOrders: (order: Record<string, unknown>) => {
      return (
        (order.Scripname && (order.Scripname as string).toLowerCase().includes(searchLower)) ||
        (order.Trsym && (order.Trsym as string).toLowerCase().includes(searchLower)) ||
        (order.Trantype && (order.Trantype as string).toLowerCase().includes(searchLower)) ||
        (order.Status && (order.Status as string).toLowerCase().includes(searchLower)) ||
        (order.Qty && order.Qty.toString().includes(searchTerm)) ||
        (order.Prc && order.Prc.toString().includes(searchTerm)) ||
        (order.OrderedTime && (order.OrderedTime as string).toLowerCase().includes(searchLower))
      )
    },
    
    executedOrders: (order: Record<string, unknown>) => {
      return (
        (order.Scripname && (order.Scripname as string).toLowerCase().includes(searchLower)) ||
        (order.Trsym && (order.Trsym as string).toLowerCase().includes(searchLower)) ||
        (order.Trantype && (order.Trantype as string).toLowerCase().includes(searchLower)) ||
        (order.Status && (order.Status as string).toLowerCase().includes(searchLower)) ||
        (order.Pcode && (order.Pcode as string).toLowerCase().includes(searchLower)) ||
        (order.Prctype && (order.Prctype as string).toLowerCase().includes(searchLower)) ||
        (order.Qty && order.Qty.toString().includes(searchTerm)) ||
        (order.Prc && order.Prc.toString().includes(searchTerm)) ||
        (order.OrderedTime && (order.OrderedTime as string).toLowerCase().includes(searchLower))
      )
    },
    
    tradeBook: (trade: Record<string, unknown>) => {
      return (
        (trade.tradingsymbol && (trade.tradingsymbol as string).toLowerCase().includes(searchLower)) ||
        (trade.symbol && (trade.symbol as string).toLowerCase().includes(searchLower)) ||
        (trade.transactiontype && (trade.transactiontype as string).toLowerCase().includes(searchLower)) ||
        (trade.quantity && trade.quantity.toString().includes(searchTerm)) ||
        (trade.price && trade.price.toString().includes(searchTerm)) ||
        (trade.pnl && trade.pnl.toString().includes(searchTerm)) ||
        (trade.time && (trade.time as string).toLowerCase().includes(searchLower)) ||
        (trade.nestordernumber && trade.nestordernumber.toString().includes(searchTerm))
      )
    }
  }
}

export const filterData = <T>(data: T[], searchTerm: string, filterType: 'pendingOrders' | 'executedOrders' | 'tradeBook'): T[] => {
  if (!searchTerm.trim()) {
    return data
  }
  
  const filter = createSearchFilter(searchTerm)
  return data.filter(filter[filterType] as (item: T) => boolean)
}
