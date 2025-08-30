import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-tan-100 via-tan-50 to-tan-100 bg-[length:200%_100%]'
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }
  
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '20px'
  }
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-tan-100 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton width="60%" height="16px" className="mb-2" />
          <Skeleton width="40%" height="32px" />
        </div>
        <Skeleton variant="circular" width="48px" height="48px" />
      </div>
      <Skeleton width="100%" height="12px" className="mt-4" />
    </div>
  )
}