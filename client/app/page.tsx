'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" 
         style={{
           backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjNlNWFiO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3R5bGU9InN0b3AtY29sb3I6I2VkZDU5NDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZGJiZjk0O3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmFkaWVudCkiIC8+Cjwvc3ZnPg==')`
         }}>
      
      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-xl font-light text-gray-800 tracking-wide">
              SUNDAY TAN
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wide">
                Home
              </Link>
              <Link href="/book" className="text-sm text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wide">
                Services
              </Link>
              <Link href="/book" className="text-sm text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wide">
                Contact
              </Link>
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wide">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <div className="max-w-4xl">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-white mb-8 leading-tight tracking-wide">
            REAL BODIES.
            <br />
            FAKE TANS.
            <br />
            <span className="italic">SUNDAY TAN.</span>
          </h1>
        </div>
      </div>

      {/* Book Now Button */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10">
        <Link 
          href="/book" 
          className="bg-white text-gray-800 hover:bg-gray-100 font-medium py-4 px-12 rounded-full transition-all duration-300 uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          Book Now
        </Link>
      </div>
    </div>
  )
}