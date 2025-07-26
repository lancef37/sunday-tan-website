'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'

interface Booking {
  _id: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  paymentStatus: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
  appointments: Array<{
    date: string;
    notes?: string;
  }>;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'schedule' | 'clients'>('schedule')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const token = Cookies.get('adminToken')
    if (token) {
      setIsLoggedIn(true)
      fetchData()
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, { password })
      Cookies.set('adminToken', response.data.token, { expires: 7 })
      setIsLoggedIn(true)
      fetchData()
    } catch (error) {
      alert('Invalid password')
    }
  }

  const handleLogout = () => {
    Cookies.remove('adminToken')
    setIsLoggedIn(false)
    setPassword('')
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const token = Cookies.get('adminToken')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      
      const [bookingsRes, clientsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/bookings`, config),
        axios.get(`${API_URL}/api/admin/clients`, config)
      ])
      
      setBookings(bookingsRes.data)
      setClients(clientsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-tan-cream flex items-center justify-center">
        <div className="card max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-gold"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tan-cream">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-tan-bronze">Admin Dashboard</h1>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'schedule' ? 'bg-tan-gold text-white' : 'bg-gray-200'
            }`}
          >
            Schedule & Bookings
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'clients' ? 'bg-tan-gold text-white' : 'bg-gray-200'
            }`}
          >
            Client Management
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Recent Bookings</h2>
              <button onClick={fetchData} className="btn-secondary">
                Refresh
              </button>
            </div>
            
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Client</th>
                      <th className="text-left py-2">Phone</th>
                      <th className="text-left py-2">Payment</th>
                      <th className="text-left py-2">Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="border-b">
                        <td className="py-2">{formatDate(booking.date)}</td>
                        <td className="py-2">{booking.time}</td>
                        <td className="py-2">{booking.clientName}</td>
                        <td className="py-2">{booking.clientPhone}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            booking.paymentStatus === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2">{formatDate(booking.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No bookings found</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Client Management</h2>
            
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{client.name}</h3>
                        <p className="text-gray-600">{client.phone}</p>
                      </div>
                    </div>
                    
                    {client.appointments.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Appointment History</h4>
                        <div className="space-y-1">
                          {client.appointments.map((apt, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {formatDate(apt.date)}
                              {apt.notes && ` - ${apt.notes}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {clients.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No clients found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}