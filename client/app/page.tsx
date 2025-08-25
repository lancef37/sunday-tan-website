'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Tan Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/tan-background.png')`,
        }}
      >
        {/* Subtle overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-tan-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <Link href="/" className="group">
              <h1 className="text-2xl font-serif font-semibold text-tan-900 tracking-wide transition-all duration-300 group-hover:text-tan-700">
                Sunday Tan
              </h1>
              <div className="h-0.5 w-0 bg-tan-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="nav-link">
                Home
              </Link>
              <Link href="/book" className="nav-link">
                Book Now
              </Link>
              {isLoggedIn ? (
                <Link href="/account" className="nav-link">
                  My Account
                </Link>
              ) : (
                <Link href="/login" className="nav-link">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-6">
        <div className="max-w-5xl animate-fade-in">
          {/* Main heading with header font styling */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold mb-16 leading-[0.9] tracking-wide text-left" style={{color: '#654321'}}>
            <span className="block animate-slide-up" style={{animationDelay: '0.1s', color: '#654321'}}>
              REAL BODIES.
            </span>
            <span className="block animate-slide-up" style={{animationDelay: '0.2s', color: '#654321'}}>
              FAKE TANS.
            </span>
            <span className="block font-serif animate-slide-up" style={{animationDelay: '0.3s', color: '#654321'}}>
              SUNDAY TAN.
            </span>
          </h1>

          {/* Book Now Button - Centered under text */}
          <div className="text-center animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Link 
              href="/book" 
              className="group relative bg-tan-900 hover:bg-tan-800 text-tan-50 font-medium py-4 px-12 rounded-full transition-all duration-500 uppercase tracking-[0.15em] text-sm shadow-2xl hover:shadow-tan-900/30 transform hover:-translate-y-2 border border-tan-800/20 inline-block"
            >
              <span className="relative z-10">Book Your Session</span>
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-tan-700 to-tan-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-full bg-tan-500/20 blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-8 w-1 h-16 bg-gradient-to-b from-tan-300 to-transparent opacity-60 hidden lg:block"></div>
      <div className="absolute bottom-1/4 right-8 w-1 h-16 bg-gradient-to-t from-tan-300 to-transparent opacity-60 hidden lg:block"></div>
    </div>
  )
}