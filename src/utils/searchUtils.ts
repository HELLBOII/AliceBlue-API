/**
 * Utility functions for search and filtering
 */

export const createSearchFilter = (searchTerm: string) => {
  const searchLower = searchTerm.toLowerCase()
  
  return {
    pendingOrders: (order: any) => {
      return (
        (order.Scripname && order.Scripname.toLowerCase().includes(searchLower)) ||
        (order.Trsym && order.Trsym.toLowerCase().includes(searchLower)) ||
        (order.Trantype && order.Trantype.toLowerCase().includes(searchLower)) ||
        (order.Status && order.Status.toLowerCase().includes(searchLower)) ||
        (order.Qty && order.Qty.toString().includes(searchTerm)) ||
        (order.Prc && order.Prc.toString().includes(searchTerm)) ||
        (order.OrderedTime && order.OrderedTime.toLowerCase().includes(searchLower))
      )
    },
    
    executedOrders: (order: any) => {
      return (
        (order.Scripname && order.Scripname.toLowerCase().includes(searchLower)) ||
        (order.Trsym && order.Trsym.toLowerCase().includes(searchLower)) ||
        (order.Trantype && order.Trantype.toLowerCase().includes(searchLower)) ||
        (order.Status && order.Status.toLowerCase().includes(searchLower)) ||
        (order.Pcode && order.Pcode.toLowerCase().includes(searchLower)) ||
        (order.Prctype && order.Prctype.toLowerCase().includes(searchLower)) ||
        (order.Qty && order.Qty.toString().includes(searchTerm)) ||
        (order.Prc && order.Prc.toString().includes(searchTerm)) ||
        (order.OrderedTime && order.OrderedTime.toLowerCase().includes(searchLower))
      )
    },
    
    tradeBook: (trade: any) => {
      return (
        (trade.tradingsymbol && trade.tradingsymbol.toLowerCase().includes(searchLower)) ||
        (trade.symbol && trade.symbol.toLowerCase().includes(searchLower)) ||
        (trade.transactiontype && trade.transactiontype.toLowerCase().includes(searchLower)) ||
        (trade.quantity && trade.quantity.toString().includes(searchTerm)) ||
        (trade.price && trade.price.toString().includes(searchTerm)) ||
        (trade.pnl && trade.pnl.toString().includes(searchTerm)) ||
        (trade.time && trade.time.toLowerCase().includes(searchLower)) ||
        (trade.nestordernumber && trade.nestordernumber.toString().includes(searchTerm))
      )
    }
  }
}

export const filterData = (data: any[], searchTerm: string, filterType: 'pendingOrders' | 'executedOrders' | 'tradeBook') => {
  if (!searchTerm.trim()) {
    return data
  }
  
  const filter = createSearchFilter(searchTerm)
  return data.filter(filter[filterType])
}
