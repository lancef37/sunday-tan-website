'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'

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
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-tan-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 md:py-5">
            <Link href="/" className="group">
              <h1 className="text-xl sm:text-2xl font-serif font-semibold text-tan-900 tracking-wide transition-all duration-300 group-hover:text-tan-700">
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
              <Link href="/care" className="nav-link">
                Tan Care
              </Link>
              <Link href="/faq" className="nav-link">
                FAQ
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-140px)] px-4 sm:px-6 py-8 md:py-0">
        <div className="max-w-5xl w-full animate-fade-in">
          {/* Main heading with mobile-optimized sizing */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-semibold mb-8 sm:mb-12 md:mb-16 leading-[0.95] sm:leading-[0.9] tracking-wide text-center md:text-left" style={{color: '#654321'}}>
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

          {/* Book Now Button - Mobile optimized */}
          <div className="text-center animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Link 
              href="/book" 
              className="group relative bg-tan-900 hover:bg-tan-800 text-tan-50 font-medium py-3 sm:py-4 px-8 sm:px-12 rounded-full transition-all duration-500 uppercase tracking-[0.1em] sm:tracking-[0.15em] text-xs sm:text-sm shadow-2xl hover:shadow-tan-900/30 transform hover:-translate-y-1 md:hover:-translate-y-2 border border-tan-800/20 inline-block"
            >
              <span className="relative z-10">Book Your Session</span>
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-tan-700 to-tan-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {/* Subtle glow - hidden on mobile for performance */}
              <div className="hidden sm:block absolute inset-0 rounded-full bg-tan-500/20 blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
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