import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  className = '' 
}: StatsCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-tan-100 p-6 hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-tan-600">{title}</p>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-tan-900">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-tan-500">{description}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-tan-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}