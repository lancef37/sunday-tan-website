'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [pathname])

  useEffect(() => {
    // Close menu when route changes
    setIsOpen(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    router.push('/')
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-3 rounded-lg bg-white border-2 border-gray-800 shadow-xl"
        aria-label="Toggle menu"
      >
        <div className="w-6 h-6 relative flex flex-col justify-center">
          <span 
            className={`absolute h-0.5 w-6 bg-gray-800 transform transition-all duration-300 ${
              isOpen ? 'rotate-45' : '-translate-y-2'
            }`}
          />
          <span 
            className={`absolute h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
              isOpen ? 'opacity-0' : ''
            }`}
          />
          <span 
            className={`absolute h-0.5 w-6 bg-gray-800 transform transition-all duration-300 ${
              isOpen ? '-rotate-45' : 'translate-y-2'
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div 
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-white z-40 transform transition-transform duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-tan-200 bg-gradient-to-br from-tan-50 to-tan-100">
            <h2 className="text-2xl font-serif font-semibold text-tan-900">Sunday Tan</h2>
            {isLoggedIn && (
              <p className="text-sm text-tan-600 mt-1">Welcome back!</p>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-6">
            <div className="space-y-1">
              <MobileNavLink href="/" onClick={() => setIsOpen(false)}>
                <HomeIcon />
                Home
              </MobileNavLink>
              
              <MobileNavLink href="/book" onClick={() => setIsOpen(false)}>
                <BookIcon />
                Book Now
              </MobileNavLink>
              
              <MobileNavLink href="/membership" onClick={() => setIsOpen(false)}>
                <MembershipIcon />
                Membership
              </MobileNavLink>
              
              <MobileNavLink href="/care" onClick={() => setIsOpen(false)}>
                <CareIcon />
                Tan Care
              </MobileNavLink>
              
              <MobileNavLink href="/faq" onClick={() => setIsOpen(false)}>
                <FAQIcon />
                FAQ
              </MobileNavLink>

              {isLoggedIn ? (
                <>
                  <div className="border-t border-tan-200 my-4 pt-4">
                    <MobileNavLink href="/account" onClick={() => setIsOpen(false)}>
                      <AccountIcon />
                      My Account
                    </MobileNavLink>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-tan-700 hover:bg-tan-50 hover:text-tan-900 transition-colors"
                    >
                      <LogoutIcon />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t border-tan-200 my-4 pt-4 space-y-1">
                  <MobileNavLink href="/login" onClick={() => setIsOpen(false)}>
                    <LoginIcon />
                    Sign In
                  </MobileNavLink>
                  
                  <MobileNavLink href="/register" onClick={() => setIsOpen(false)}>
                    <RegisterIcon />
                    Create Account
                  </MobileNavLink>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-tan-200 bg-tan-50">
            <Link
              href="/book"
              onClick={() => setIsOpen(false)}
              className="w-full bg-tan-700 hover:bg-tan-800 text-white font-semibold py-3 px-6 rounded-full text-center transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="text-lg">✨</span>
              Book Your Tan
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// Mobile Navigation Link Component
function MobileNavLink({ href, children, onClick }: { href: string, children: React.ReactNode, onClick: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === href
  
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-tan-100 text-tan-900 font-medium' 
          : 'text-tan-700 hover:bg-tan-50 hover:text-tan-900'
      }`}
    >
      {children}
    </Link>
  )
}

// Icon Components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const MembershipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CareIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const FAQIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AccountIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const LoginIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
)

const RegisterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)