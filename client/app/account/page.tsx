'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Booking {
  _id: string
  date: string
  time: string
  status: string
  paymentStatus: string
  promoCode?: {
    code?: string
    discountAmount?: number
  }
  finalAmount?: number
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  phone: string
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetchUserData()
    fetchBookings()
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await axios.get(`${API_URL}/api/auth/user/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth error:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setBookings(response.data)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-tan-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 to-tan-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="text-2xl font-serif font-semibold text-tan-900">
              Sunday Tan
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/book" className="text-tan-600 hover:text-tan-900">
                Book Appointment
              </Link>
              <button
                onClick={handleLogout}
                className="bg-tan-700 hover:bg-tan-800 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-serif font-semibold text-tan-900 mb-6">My Account</h1>
          
          {user && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-lg font-medium text-tan-700 mb-4">Personal Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-tan-600">Name:</span>
                    <p className="text-tan-900">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-tan-600">Email:</span>
                    <p className="text-tan-900">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-tan-600">Phone:</span>
                    <p className="text-tan-900">{user.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-semibold text-tan-900">My Appointments</h2>
            <Link
              href="/book"
              className="bg-tan-700 hover:bg-tan-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Book New
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-tan-600 mb-4">You haven't booked any appointments yet.</p>
              <Link
                href="/book"
                className="inline-block bg-tan-700 hover:bg-tan-800 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Book Your First Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking._id} className="border border-tan-200 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {booking.paymentStatus === 'paid' && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-medium text-tan-900">
                        {formatDate(booking.date)}
                      </p>
                      <p className="text-tan-600">
                        Time: {formatTime(booking.time)}
                      </p>
                      {booking.promoCode?.code && (
                        <p className="text-sm text-tan-600 mt-1">
                          Promo: {booking.promoCode.code} (-${booking.promoCode.discountAmount})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}