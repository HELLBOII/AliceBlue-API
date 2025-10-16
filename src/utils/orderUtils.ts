/**
 * Utility functions for order data processing
 */

export const getStatusIcon = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'clock'
    case 'EXECUTED':
    case 'COMPLETE':
      return 'check-circle'
    case 'CANCELLED':
    case 'REJECTED':
      return 'x-circle'
    default:
      return 'alert-circle'
  }
}

export const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-100'
    case 'EXECUTED':
    case 'COMPLETE':
      return 'text-green-600 bg-green-100'
    case 'CANCELLED':
      return 'text-red-600 bg-red-100'
    case 'REJECTED':
      return 'text-orange-600 bg-orange-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export const getTransactionTypeColor = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'B':
    case 'BUY':
      return 'bg-green-100 text-green-800'
    case 'S':
    case 'SELL':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const formatOrderTime = (timeString: string) => {
  if (!timeString) return 'N/A'
  return timeString.split(" ")[1] || timeString
}

export const formatPrice = (price: unknown) => {
  if (!price) return 'N/A'
  return price.toString()
}

export const formatPnl = (pnl: unknown) => {
  if (!pnl) return 'N/A'
  const pnlValue = parseFloat(pnl.toString())
  return {
    value: pnl.toString(),
    isPositive: pnlValue >= 0,
    className: pnlValue >= 0 ? 'text-green-600' : 'text-red-600'
  }
}

export const getOrderDisplayName = (order: Record<string, unknown>) => {
  return (order.Scripname || order.Trsym || order.Sym || order.tradingsymbol || order.symbol || 'N/A') as string
}

export const getOrderQuantity = (order: Record<string, unknown>) => {
  return (order.Qty || order.bqty || order.quantity || 'N/A') as string
}

export const getOrderPrice = (order: Record<string, unknown>) => {
  return (order.Prc || order.price || 'N/A') as string
}
