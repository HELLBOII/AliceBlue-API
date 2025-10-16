'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  showClearButton?: boolean
  onClear?: () => void
  clearButtonText?: string
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  showClearButton = false,
  onClear,
  clearButtonText = 'Clear Search',
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex-1 flex items-center justify-center ${className}`}>
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Icon className="w-10 h-10 text-blue-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-gray-500 text-base leading-relaxed">
          {description}
        </p>
        {showClearButton && onClear && (
          <button
            onClick={onClear}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            {clearButtonText}
          </button>
        )}
      </div>
    </div>
  )
}
