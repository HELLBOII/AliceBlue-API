/**
 * Application configuration
 * Centralizes all API endpoints and URLs
 */

interface AppConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  environment: string
}

const getConfig = (): AppConfig => {
  // Check for environment variables first
  const apiBaseUrl = 'https://alice-blue-api.vercel.app:8000' 
  const wsBaseUrl = 'ws://localhost:8000'
  const environment = 'development'

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

// Debug logging
console.log('🔧 App Config:', {
  apiBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  environment: ENVIRONMENT
})
