import React from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'destructive'
}

export function Alert({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}: AlertProps) {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800'
  }
  
  return (
    <div 
      className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function AlertDescription({ 
  children, 
  className = '', 
  ...props 
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  )
}