/**
 * Utility functions for pagination
 */

export const getPaginatedData = (data: any[], page: number, pageSize: number) => {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return data.slice(startIndex, endIndex)
}

export const getTotalPages = (data: any[], pageSize: number) => {
  if (!Array.isArray(data) || data.length === 0) {
    return 0
  }
  return Math.ceil(data.length / pageSize)
}

export const getPaginationInfo = (data: any[], page: number, pageSize: number) => {
  const totalItems = data.length
  const totalPages = getTotalPages(data, pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)
  
  return {
    totalItems,
    totalPages,
    startItem,
    endItem,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }
}
