import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'default',
  disabled = false,
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variantClasses = {
    default: 'bg-tan-700 text-white hover:bg-tan-800 focus-visible:ring-tan-700',
    destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
    outline: 'border border-tan-300 bg-white hover:bg-tan-50 focus-visible:ring-tan-700',
    secondary: 'bg-tan-100 text-tan-900 hover:bg-tan-200 focus-visible:ring-tan-700',
    ghost: 'hover:bg-tan-100 hover:text-tan-900',
    link: 'text-tan-700 underline-offset-4 hover:underline'
  }
  
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}