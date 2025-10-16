'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  DollarSign, 
  Target, 
  Shield, 
  User, 
  Key,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react'

interface AppSettings {
  IsEncrypted: boolean
  Settings: {
    ContractPriceRange: number
    ContractDateRange: number
    ProfitMargin: number
    ProfitMarginType: string
    StopLossMargin: number
    StopLossMarginType: string
    LimitAvailableFund: number
    MinOrderQuantity: number
    MaxOrderQuantity: number
    AutoSellOff: {
      RetryCount: number
      MarginPercentage: number
      TrailPercentage: number
    }
    AutoStoploss: {
      RetryCount: number
      MarginPercentage: number
      TrailPercentage: number
    }
    GeneralRetryCount: number
    AliceBlueAccounts: Array<{
      Name: string
      Category: string
      UserId: string
      ApiKey: string
    }>
  }
  Logging: {
    TradeLog: {
      Options: {
        Folder: string
        File: string
        Extension: string
      }
      LogLevel: {
        'Options.Trading.Bot': string
      }
    }
  }
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [showApiKeys, setShowApiKeys] = useState<{ [key: number]: boolean }>({})

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setMessage({ type: 'error', text: 'Failed to load settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    // Validate settings before saving
    if (!validateSettings()) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        
        // Reload credentials in the server
        try {
          const reloadResponse = await fetch('/api/reload-credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (reloadResponse.ok) {
            setMessage({ type: 'success', text: 'Settings saved and credentials reloaded successfully!' })
          } else {
            setMessage({ type: 'info', text: 'Settings saved but failed to reload credentials. Please restart the server.' })
          }
        } catch (reloadError) {
          setMessage({ type: 'info', text: 'Settings saved but failed to reload credentials. Please restart the server.' })
        }
        
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (path: string, value: any) => {
    if (!settings) return

    const keys = path.split('.')
    const newSettings = { ...settings }
    let current: any = newSettings

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    setSettings(newSettings)
  }

  const addAccount = () => {
    if (!settings) return

    const newAccount = {
      Name: '',
      Category: 'Secondary',
      UserId: '',
      ApiKey: ''
    }

    setSettings({
      ...settings,
      Settings: {
        ...settings.Settings,
        AliceBlueAccounts: [...settings.Settings.AliceBlueAccounts, newAccount]
      }
    })
  }

  const toggleApiKeyVisibility = (index: number) => {
    setShowApiKeys(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const removeAccount = (index: number) => {
    if (!settings) return

    // Check if trying to remove the primary account
    if (settings.Settings.AliceBlueAccounts[index].Category === 'Primary') {
      setMessage({ type: 'error', text: 'Cannot remove Primary account. At least one Primary account is required.' })
      return
    }

    setSettings({
      ...settings,
      Settings: {
        ...settings.Settings,
        AliceBlueAccounts: settings.Settings.AliceBlueAccounts.filter((_, i) => i !== index)
      }
    })
  }

  const updateAccountCategory = (index: number, newCategory: string) => {
    if (!settings) return

    // Check if trying to change to Primary when another Primary already exists
    if (newCategory === 'Primary') {
      const hasPrimary = settings.Settings.AliceBlueAccounts.some((account, i) => 
        i !== index && account.Category === 'Primary'
      )
      if (hasPrimary) {
        setMessage({ type: 'error', text: 'Only one Primary account is allowed. Please change the existing Primary account to Secondary first.' })
        return
      }
    }

    const newAccounts = [...settings.Settings.AliceBlueAccounts]
    newAccounts[index].Category = newCategory
    setSettings({
      ...settings,
      Settings: {
        ...settings.Settings,
        AliceBlueAccounts: newAccounts
      }
    })
  }

  const validateSettings = () => {
    if (!settings) return false

    // Check if there are any accounts
    if (settings.Settings.AliceBlueAccounts.length === 0) {
      setMessage({ type: 'error', text: 'At least one AliceBlue account is required.' })
      return false
    }

    // Check if there's exactly one Primary account
    const primaryAccounts = settings.Settings.AliceBlueAccounts.filter(account => account.Category === 'Primary')
    
    if (primaryAccounts.length === 0) {
      setMessage({ type: 'error', text: 'At least one Primary account is required.' })
      return false
    }
    
    if (primaryAccounts.length > 1) {
      setMessage({ type: 'error', text: 'Only one Primary account is allowed.' })
      return false
    }

    // Check if all accounts have required fields
    for (let i = 0; i < settings.Settings.AliceBlueAccounts.length; i++) {
      const account = settings.Settings.AliceBlueAccounts[i]
      
      // Check for empty fields
      if (!account.Name.trim()) {
        setMessage({ type: 'error', text: `Account ${i + 1}: Name is required and cannot be empty.` })
        return false
      }
      
      if (!account.UserId.trim()) {
        setMessage({ type: 'error', text: `Account ${i + 1}: User ID is required and cannot be empty.` })
        return false
      }
      
      if (!account.ApiKey.trim()) {
        setMessage({ type: 'error', text: `Account ${i + 1}: API Key is required and cannot be empty.` })
        return false
      }

      // Check for minimum length requirements
      if (account.Name.trim().length < 2) {
        setMessage({ type: 'error', text: `Account ${i + 1}: Name must be at least 2 characters long.` })
        return false
      }

      if (account.UserId.trim().length < 3) {
        setMessage({ type: 'error', text: `Account ${i + 1}: User ID must be at least 3 characters long.` })
        return false
      }

      if (account.ApiKey.trim().length < 10) {
        setMessage({ type: 'error', text: `Account ${i + 1}: API Key must be at least 10 characters long.` })
        return false
      }
    }

    return true
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
          <div className="h-full overflow-y-auto p-4">
            {/* Header Shimmer */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="shimmer shimmer-delay-0">
                  <div className="h-8 w-8 bg-gray-200 rounded-lg shimmer"></div>
                </div>
                <div className="shimmer shimmer-delay-1">
                  <div className="h-6 bg-gray-200 rounded w-48 shimmer"></div>
                </div>
              </div>
              <div className="flex space-x-1">
                <div className="shimmer shimmer-delay-2">
                  <div className="h-8 bg-gray-200 rounded-lg w-20 shimmer"></div>
                </div>
                <div className="shimmer shimmer-delay-3">
                  <div className="h-8 bg-gray-200 rounded-lg w-16 shimmer"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Trading Parameters Shimmer */}
              <div className="p-2 space-y-4 flex flex-col">
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="shimmer shimmer-delay-4">
                      <div className="h-6 w-6 bg-gray-200 rounded-lg shimmer"></div>
                    </div>
                    <div className="shimmer shimmer-delay-0">
                      <div className="h-4 bg-gray-200 rounded w-32 shimmer"></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="shimmer shimmer-delay-1">
                        <div className="h-3 bg-gray-200 rounded w-20 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                      <div className="shimmer shimmer-delay-2">
                        <div className="h-3 bg-gray-200 rounded w-24 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="shimmer shimmer-delay-3">
                        <div className="h-3 bg-gray-200 rounded w-20 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                      <div className="shimmer shimmer-delay-4">
                        <div className="h-3 bg-gray-200 rounded w-24 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="shimmer shimmer-delay-0">
                        <div className="h-3 bg-gray-200 rounded w-20 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                      <div className="shimmer shimmer-delay-1">
                        <div className="h-3 bg-gray-200 rounded w-20 shimmer mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded shimmer"></div>
                      </div>
                    </div>

                    <div className="shimmer shimmer-delay-2">
                      <div className="h-3 bg-gray-200 rounded w-28 shimmer mb-1"></div>
                      <div className="h-8 bg-gray-200 rounded shimmer"></div>
                    </div>
                  </div>
                </div>

                {/* Auto Sell Off Settings Shimmer */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="shimmer shimmer-delay-3">
                      <div className="h-6 w-6 bg-gray-200 rounded-lg shimmer"></div>
                    </div>
                    <div className="shimmer shimmer-delay-4">
                      <div className="h-4 bg-gray-200 rounded w-24 shimmer"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="shimmer shimmer-delay-0">
                      <div className="h-3 bg-gray-200 rounded w-16 shimmer mb-1"></div>
                      <div className="h-8 bg-gray-200 rounded shimmer"></div>
                    </div>
                    <div className="shimmer shimmer-delay-1">
                      <div className="h-3 bg-gray-200 rounded w-12 shimmer mb-1"></div>
                      <div className="h-8 bg-gray-200 rounded shimmer"></div>
                    </div>
                    <div className="shimmer shimmer-delay-2">
                      <div className="h-3 bg-gray-200 rounded w-12 shimmer mb-1"></div>
                      <div className="h-8 bg-gray-200 rounded shimmer"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AliceBlue Accounts Shimmer */}
              <div className="p-2 space-y-4 flex flex-col">
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3 flex flex-col max-h-96">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="shimmer shimmer-delay-3">
                        <div className="h-6 w-6 bg-gray-200 rounded-lg shimmer"></div>
                      </div>
                      <div className="shimmer shimmer-delay-4">
                        <div className="h-4 bg-gray-200 rounded w-32 shimmer"></div>
                      </div>
                    </div>
                    <div className="shimmer shimmer-delay-0">
                      <div className="h-6 bg-gray-200 rounded w-20 shimmer"></div>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className={`shimmer shimmer-delay-${index + 1}`}>
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="h-4 bg-gray-200 rounded w-24 shimmer"></div>
                            <div className="h-4 bg-gray-200 rounded w-16 shimmer"></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="h-3 bg-gray-200 rounded w-12 shimmer mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-16 shimmer mb-1"></div>
                            <div className="h-8 bg-gray-200 rounded shimmer"></div>
                            <div className="h-8 bg-gray-200 rounded shimmer"></div>
                            <div className="h-3 bg-gray-200 rounded w-12 shimmer mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-12 shimmer mb-1"></div>
                            <div className="h-8 bg-gray-200 rounded shimmer"></div>
                            <div className="h-8 bg-gray-200 rounded shimmer"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Settings Not Available</h3>
              <p className="text-slate-600 text-sm">Unable to load configuration settings.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
        <div className="h-full overflow-y-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Configuration Settings</h2>
                <p className="text-xs text-slate-600">Manage trading parameters and account settings</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={loadSettings}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-xs font-medium flex items-center space-x-1"
              >
                <Save className="w-3 h-3" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-3 p-2 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' ? 'bg-green-100 text-green-800' :
              message.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-3 h-3" /> : 
               message.type === 'error' ? <AlertTriangle className="w-3 h-3" /> : 
               <Settings className="w-3 h-3" />}
              <span className="text-xs font-medium">{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Trading Parameters */}
            <div className="p-2 space-y-4 flex flex-col">
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                    <Target className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Trading Parameters</h3>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contract Price Range</label>
                      <input
                        type="number"
                        value={settings.Settings.ContractPriceRange}
                        onChange={(e) => updateSetting('Settings.ContractPriceRange', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Contract Price Range"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contract Date Range (months)</label>
                      <input
                        type="number"
                        value={settings.Settings.ContractDateRange}
                        onChange={(e) => updateSetting('Settings.ContractDateRange', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Contract Date Range"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Profit Margin (%)</label>
                      <input
                        type="number"
                        value={settings.Settings.ProfitMargin}
                        onChange={(e) => updateSetting('Settings.ProfitMargin', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Profit Margin"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stop Loss Margin (%)</label>
                      <input
                        type="number"
                        value={settings.Settings.StopLossMargin}
                        onChange={(e) => updateSetting('Settings.StopLossMargin', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Stop Loss Margin"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Order Quantity</label>
                      <input
                        type="number"
                        value={settings.Settings.MinOrderQuantity}
                        onChange={(e) => updateSetting('Settings.MinOrderQuantity', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Min Order Quantity"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Order Quantity</label>
                      <input
                        type="number"
                        value={settings.Settings.MaxOrderQuantity}
                        onChange={(e) => updateSetting('Settings.MaxOrderQuantity', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Max Order Quantity"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Available Fund Limit (₹)</label>
                    <input
                      type="number"
                      value={settings.Settings.LimitAvailableFund}
                      onChange={(e) => updateSetting('Settings.LimitAvailableFund', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label="Available Fund Limit"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Sell Off Settings */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Auto Sell Off</h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Retry Count</label>
                    <input
                      type="number"
                      value={settings.Settings.AutoSellOff.RetryCount}
                      onChange={(e) => updateSetting('Settings.AutoSellOff.RetryCount', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label="Auto Sell Off Retry Count"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Margin %</label>
                    <input
                      type="number"
                      value={settings.Settings.AutoSellOff.MarginPercentage}
                      onChange={(e) => updateSetting('Settings.AutoSellOff.MarginPercentage', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label="Auto Sell Off Margin Percentage"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Trail %</label>
                    <input
                      type="number"
                      value={settings.Settings.AutoSellOff.TrailPercentage}
                      onChange={(e) => updateSetting('Settings.AutoSellOff.TrailPercentage', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label="Auto Sell Off Trail Percentage"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AliceBlue Accounts */}
            <div className="p-2 space-y-4 flex flex-col">
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-md border border-slate-200 p-3 flex flex-col max-h-96">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">AliceBlue Accounts</h3>
                    {settings.IsEncrypted && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        <Lock className="w-3 h-3" />
                        <span>Encrypted</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={addAccount}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
                  >
                    Add Account
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {/* Primary account validation warning */}
                  {settings.Settings.AliceBlueAccounts.filter(account => account.Category === 'Primary').length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">Primary account required</span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">At least one Primary account is required for trading operations.</p>
                    </div>
                  )}
                  
                  {settings.Settings.AliceBlueAccounts.map((account, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-800">
                            {account.Name.trim() || `Account ${index + 1}`}
                          </h4>
                          {account.Category === 'Primary' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                              Primary
                            </span>
                          )}
                        </div>
                        {account.Category === 'Secondary' && (
                          <button
                            onClick={() => removeAccount(index)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        )}
                        {account.Category === 'Primary' && (
                          <span className="text-xs text-gray-500 italic">
                            Cannot remove Primary
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={account.Name}
                            onChange={(e) => {
                              const newAccounts = [...settings.Settings.AliceBlueAccounts]
                              newAccounts[index].Name = e.target.value
                              updateSetting('Settings.AliceBlueAccounts', newAccounts)
                            }}
                            className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              !account.Name.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            aria-label={`Account ${index + 1} Name`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                          <select
                            value={account.Category}
                            onChange={(e) => updateAccountCategory(index, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={`Account ${index + 1} Category`}
                          >
                            <option value="Primary">Primary</option>
                            <option value="Secondary">Secondary</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            User ID <span className="text-red-500">*</span>
                            {settings.IsEncrypted && <Lock className="w-3 h-3 inline ml-1 text-green-600" />}
                          </label>
                          <input
                            type="text"
                            value={account.UserId}
                            onChange={(e) => {
                              const newAccounts = [...settings.Settings.AliceBlueAccounts]
                              newAccounts[index].UserId = e.target.value
                              updateSetting('Settings.AliceBlueAccounts', newAccounts)
                            }}
                            className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              !account.UserId.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            aria-label={`Account ${index + 1} User ID`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            API Key <span className="text-red-500">*</span>
                            {settings.IsEncrypted && <Lock className="w-3 h-3 inline ml-1 text-green-600" />}
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKeys[index] ? "text" : "password"}
                              value={account.ApiKey}
                              onChange={(e) => {
                                const newAccounts = [...settings.Settings.AliceBlueAccounts]
                                newAccounts[index].ApiKey = e.target.value
                                updateSetting('Settings.AliceBlueAccounts', newAccounts)
                              }}
                              className={`w-full px-2 py-1 pr-8 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                !account.ApiKey.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              aria-label={`Account ${index + 1} API Key`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleApiKeyVisibility(index)}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showApiKeys[index] ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
