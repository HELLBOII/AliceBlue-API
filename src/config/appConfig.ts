/**
 * Application configuration
 * Centralizes all API endpoints and URLs
 */

interface AppConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  environment: string
}

// Function to get base URL from current window location
function getURL(): string {
  if (typeof window !== 'undefined') {
    try {
      const url = window.location.href
      
      // Pattern 1: Extract protocol, host, and first path segment
      if (/([^:]*)\:\/\/([^/]*)\/([^/]*)\/.*/.test(url)) {
        return (RegExp.$1 + "://" + RegExp.$2 + "/" + RegExp.$3 + "/")
      }
      
      // Pattern 2: Extract just protocol and host (for root domain)
      if (/([^:]*)\:\/\/([^/]*)/.test(url)) {
        return (RegExp.$1 + "://" + RegExp.$2 + "/")
      }
      
      // Fallback: return current origin
      return window.location.origin + "/"
    } catch (error) {
      console.warn('Error extracting URL from window.location:', error)
      return ""
    }
  }
  return ""
}

const getConfig = (): AppConfig => {
  // Use only dynamic URL extraction from window.location
  // Fallback to localhost for development
  
  let apiBaseUrl = 'http://localhost:8000'
  let wsBaseUrl = 'http://localhost:8000'
  
  // Try to get URL from window location
  const baseUrl = getURL()
  if (baseUrl) {
    // Remove trailing slash and add port if needed
    apiBaseUrl = baseUrl.replace(/\/$/, '') + ':8000'
    wsBaseUrl = baseUrl.replace(/\/$/, '') + ':8000'
  }
  
  const environment = 'production'

  return {
    apiBaseUrl,
    wsBaseUrl,
    environment
  }
}

export const config = getConfig()

// Export individual config values for convenience
export const API_BASE_URL = config.apiBaseUrl
export const WS_BASE_URL = config.wsBaseUrl
export const ENVIRONMENT = config.environment

// Debug logging
console.log('🔧 App Config:', {
  apiBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  environment: ENVIRONMENT,
  currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
})

// Helper functions
export const getApiUrl = (endpoint: string): string => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  console.log(`🔗 API URL: ${url}`)
  return url
}

export const getWsUrl = (endpoint: string): string => {
  const url = `${WS_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  console.log(`🔌 WebSocket URL: ${url}`)
  return url
}
