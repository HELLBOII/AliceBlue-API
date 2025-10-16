'use client'

import { useEffect } from 'react'
import { User, Mail, Phone, Shield } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'

export default function AccountDetailsTab() {
  const { profile, getProfile, loading, errors } = useAPI()
  
  // Fetch profile on component mount
  useEffect(() => {
    getProfile()
  }, [getProfile])

  const profileData = profile && profile.length > 0 ? profile[0] : null

  console.log('profileData', profileData)

  return (
    <div className="h-full flex flex-col">

      {/* Profile Card */}
      <div className="flex-1 overflow-hidden border border-slate-200 rounded-lg bg-white min-h-0">
        {loading.profile ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Shimmer effect for form fields */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={`shimmer shimmer-delay-${index}`}>
                  {/* Label shimmer */}
                  <div className="h-4 bg-gray-200 rounded mb-2 w-24 shimmer">
                  </div>
                  {/* Input field shimmer */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <div className="h-4 w-4 bg-gray-200 rounded shimmer">
                      </div>
                    </div>
                    <div className="w-full pl-10 pr-3 py-2 bg-gray-200 rounded-lg h-10 shimmer">
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : profileData ? (
          <div className="h-full overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={profileData.accountName || ''}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none"
                  placeholder="Full Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={profileData.accountId || ''}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none"
                  placeholder="User ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={profileData.emailAddr || ''}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none"
                  placeholder="Email Address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={profileData.cellAddr || ''}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <input
                  type="text"
                  value={profileData.accountStatus || ''}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-green-600 font-medium focus:outline-none"
                  placeholder="Account Status"
                />
              </div>
            </div>
          </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-gray-500 mb-4">
                <User className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-700">No Profile Data</h3>
                <p className="text-sm text-gray-500">
                  {errors.profile ? `Error: ${errors.profile}` : 'Unable to load account details. Please try refreshing.'}
                </p>
              </div>
              <button
                onClick={() => getProfile()}
                disabled={loading.profile}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors duration-200"
              >
                {loading.profile ? 'Loading...' : 'Retry'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
