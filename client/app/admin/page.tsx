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
  status: string;
  promoCode?: {
    code: string;
    discountAmount: number;
  };
  notes?: string;
  actualRevenue?: number;
  completedAt?: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  totalAppointments: number;
  lastVisit: string;
  appointments: Array<{
    date: string;
    notes?: string;
    bookingId: {
      _id: string;
      status: string;
      paymentStatus: string;
      notes?: string;
      actualRevenue?: number;
      completedAt?: string;
    };
  }>;
}

interface Expense {
  _id: string;
  item: string;
  cost: number;
  notes?: string;
  category: string;
  createdAt: string;
}

interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  appointments: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  revenue: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  expenses: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  netRevenue: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  topClients: Client[];
  statusBreakdown: Array<{
    _id: string;
    count: number;
  }>;
  totalClients: number;
}

interface TimeBlock {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface DateOverride {
  date: string;
  type: 'open' | 'closed';
  timeBlocks: TimeBlock[];
  reason?: string;
}

interface Availability {
  weeklySchedule: WeeklySchedule;
  dateOverrides: DateOverride[];
  slotDuration: number;
  bufferTime: number;
  advanceBookingDays: number;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'clients' | 'schedule' | 'expenses' | 'stats' | 'promocodes'>('dashboard')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [newOverride, setNewOverride] = useState({
    date: '',
    type: 'open' as 'open' | 'closed',
    timeBlocks: [{ startTime: '09:00', endTime: '17:00' }],
    reason: ''
  })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newExpense, setNewExpense] = useState({
    item: '',
    cost: '',
    notes: '',
    category: 'General'
  })
  const [revenueInput, setRevenueInput] = useState('')
  const [showRevenueModal, setShowRevenueModal] = useState<string | null>(null)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    description: '',
    discountType: 'fixed' as 'fixed' | 'percentage',
    discountValue: 10,
    usageLimit: '',
    validUntil: ''
  })
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL
  console.log('API_URL being used:', API_URL)

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

  const getAuthConfig = () => {
    const token = Cookies.get('adminToken')
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const config = getAuthConfig()
      
      const [bookingsRes, clientsRes, statsRes, availabilityRes, expensesRes, promoCodesRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/bookings`, config),
        axios.get(`${API_URL}/api/admin/clients`, config),
        axios.get(`${API_URL}/api/admin/stats`, config),
        axios.get(`${API_URL}/api/admin/availability`, config),
        axios.get(`${API_URL}/api/admin/expenses`, config),
        axios.get(`${API_URL}/api/admin/promocodes`, config).catch(() => ({ data: [] }))
      ])
      
      setBookings(bookingsRes.data || [])
      setClients(clientsRes.data || [])
      setStats(statsRes.data)
      setAvailability(availabilityRes.data)
      setExpenses(expensesRes.data || [])
      setPromoCodes(promoCodesRes.data || [])
      
      // Debug logging to see booking data structure
      console.log('Bookings data:', bookingsRes.data)
      if (bookingsRes.data && bookingsRes.data.length > 0) {
        console.log('First booking structure:', bookingsRes.data[0])
        console.log('First booking promoCode:', bookingsRes.data[0].promoCode)
        console.log('PromoCode code value:', bookingsRes.data[0].promoCode?.code)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientDetails = async (clientId: string) => {
    try {
      const config = getAuthConfig()
      const response = await axios.get(`${API_URL}/api/admin/clients/${clientId}`, config)
      setSelectedClient(response.data)
    } catch (error) {
      console.error('Error fetching client details:', error)
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    if (status === 'completed') {
      setShowRevenueModal(bookingId)
      return
    }
    
    try {
      const config = getAuthConfig()
      await axios.patch(`${API_URL}/api/admin/bookings/${bookingId}`, { status }, config)
      fetchData()
    } catch (error) {
      console.error('Error updating booking status:', error)
    }
  }

  const handleRevenueSubmit = async () => {
    if (!showRevenueModal) return
    
    const revenue = parseFloat(revenueInput)
    if (isNaN(revenue) || revenue < 0) {
      alert('Please enter a valid revenue amount')
      return
    }

    try {
      const config = getAuthConfig()
      await axios.patch(`${API_URL}/api/admin/bookings/${showRevenueModal}`, {
        status: 'completed',
        actualRevenue: revenue
      }, config)
      
      setShowRevenueModal(null)
      setRevenueInput('')
      fetchData()
    } catch (error) {
      console.error('Error completing booking:', error)
      alert('Failed to mark appointment as completed')
    }
  }

  const addExpense = async () => {
    if (!newExpense.item || !newExpense.cost) {
      alert('Please fill in the item and cost fields')
      return
    }

    try {
      const config = getAuthConfig()
      await axios.post(`${API_URL}/api/admin/expenses`, newExpense, config)
      
      setNewExpense({
        item: '',
        cost: '',
        notes: '',
        category: 'General'
      })
      fetchData()
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense')
    }
  }

  const deleteExpense = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const config = getAuthConfig()
        await axios.delete(`${API_URL}/api/admin/expenses/${expenseId}`, config)
        fetchData()
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Failed to delete expense')
      }
    }
  }

  const addPromoCode = async () => {
    if (!newPromoCode.code || !newPromoCode.description) {
      alert('Please fill in the code and description fields')
      return
    }

    try {
      const config = getAuthConfig()
      const data = {
        ...newPromoCode,
        code: newPromoCode.code.toUpperCase(),
        usageLimit: newPromoCode.usageLimit ? parseInt(newPromoCode.usageLimit) : null,
        validUntil: newPromoCode.validUntil || null
      }
      
      await axios.post(`${API_URL}/api/admin/promocodes`, data, config)
      
      setNewPromoCode({
        code: '',
        description: '',
        discountType: 'fixed',
        discountValue: 10,
        usageLimit: '',
        validUntil: ''
      })
      fetchData()
    } catch (error) {
      console.error('Error adding promocode:', error)
      alert('Failed to add promocode')
    }
  }

  const updatePromoCode = async (promoCodeId: string, updates: Partial<PromoCode>) => {
    try {
      const config = getAuthConfig()
      await axios.patch(`${API_URL}/api/admin/promocodes/${promoCodeId}`, updates, config)
      fetchData()
      setEditingPromoCode(null)
    } catch (error) {
      console.error('Error updating promocode:', error)
      alert('Failed to update promocode')
    }
  }

  const deletePromoCode = async (promoCodeId: string, code: string) => {
    if (confirm(`Are you sure you want to delete promocode "${code}"?`)) {
      try {
        const config = getAuthConfig()
        await axios.delete(`${API_URL}/api/admin/promocodes/${promoCodeId}`, config)
        fetchData()
      } catch (error) {
        console.error('Error deleting promocode:', error)
        alert('Failed to delete promocode')
      }
    }
  }

  const saveNote = async (bookingId: string) => {
    try {
      const config = getAuthConfig()
      await axios.post(`${API_URL}/api/admin/bookings/${bookingId}/notes`, { note: noteText }, config)
      setEditingNote(null)
      setNoteText('')
      fetchData()
      if (selectedClient) {
        fetchClientDetails(selectedClient._id)
      }
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const approveBooking = async (bookingId: string, clientName: string) => {
    if (confirm(`Are you sure you want to APPROVE this booking for ${clientName}? The client will be notified and payment will be processed.`)) {
      try {
        const config = getAuthConfig()
        const response = await axios.post(`${API_URL}/api/admin/bookings/${bookingId}/approve`, {}, config)
        alert(response.data.message)
        fetchData()
      } catch (error) {
        console.error('Error approving booking:', error)
        alert('Failed to approve booking')
      }
    }
  }

  const denyBooking = async (bookingId: string, clientName: string) => {
    if (confirm(`Are you sure you want to DENY this booking for ${clientName}? The client will be notified that the time slot is no longer available.`)) {
      try {
        const config = getAuthConfig()
        const response = await axios.post(`${API_URL}/api/admin/bookings/${bookingId}/deny`, {}, config)
        alert(response.data.message)
        fetchData()
      } catch (error) {
        console.error('Error denying booking:', error)
        alert('Failed to deny booking')
      }
    }
  }

  const deleteBooking = async (bookingId: string, clientName: string, date: string, time: string) => {
    if (confirm(`⚠️ PERMANENT DELETE ⚠️\n\nAre you sure you want to permanently delete this booking?\n\nClient: ${clientName}\nDate: ${date}\nTime: ${time}\n\nThis action CANNOT be undone!`)) {
      try {
        const config = getAuthConfig()
        console.log('Deleting booking ID:', bookingId)
        console.log('API URL:', `${API_URL}/api/admin/bookings/${bookingId}`)
        console.log('Auth config:', config)
        
        const response = await axios.delete(`${API_URL}/api/admin/bookings/${bookingId}`, config)
        console.log('Delete response:', response.data)
        
        alert(response.data.message)
        fetchData()
      } catch (error: any) {
        console.error('Error deleting booking:', error)
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
        
        const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to delete booking'
        alert(`Delete failed: ${errorMessage}`)
      }
    }
  }

  const deleteClient = async (clientId: string, clientName: string, totalAppointments: number) => {
    const appointmentText = totalAppointments === 1 ? '1 appointment' : `${totalAppointments} appointments`
    
    if (confirm(`🚨 PERMANENT CLIENT DELETION 🚨\n\nAre you sure you want to permanently delete this client?\n\nClient: ${clientName}\nThis will also delete ALL ${appointmentText} for this client!\n\nRevenue statistics will be updated to reflect the deletions.\n\nThis action CANNOT be undone!`)) {
      try {
        const config = getAuthConfig()
        console.log('Deleting client ID:', clientId)
        console.log('API URL:', `${API_URL}/api/admin/clients/${clientId}`)
        
        const response = await axios.delete(`${API_URL}/api/admin/clients/${clientId}`, config)
        console.log('Delete client response:', response.data)
        
        alert(response.data.message)
        fetchData()
        
        // If we're viewing this client's details, go back to client list
        if (selectedClient && selectedClient._id === clientId) {
          setSelectedClient(null)
        }
      } catch (error: any) {
        console.error('Error deleting client:', error)
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
        
        const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to delete client'
        alert(`Delete failed: ${errorMessage}`)
      }
    }
  }

  const updateWeeklySchedule = async (day: keyof WeeklySchedule, enabled: boolean) => {
    if (!availability) return
    
    try {
      const updatedSchedule = {
        ...availability.weeklySchedule,
        [day]: {
          ...availability.weeklySchedule[day],
          enabled: enabled
        }
      }
      
      const config = getAuthConfig()
      const response = await axios.put(`${API_URL}/api/admin/availability/weekly`, {
        weeklySchedule: updatedSchedule
      }, config)
      
      setAvailability(response.data.availability)
    } catch (error) {
      console.error('Error updating weekly schedule:', error)
      alert('Failed to update schedule')
    }
  }

  const addTimeBlock = async (day: keyof WeeklySchedule) => {
    if (!availability) return
    
    const newTimeBlock = { startTime: '09:00', endTime: '17:00' }
    const updatedTimeBlocks = [...availability.weeklySchedule[day].timeBlocks, newTimeBlock]
    
    try {
      const updatedSchedule = {
        ...availability.weeklySchedule,
        [day]: {
          ...availability.weeklySchedule[day],
          timeBlocks: updatedTimeBlocks
        }
      }
      
      const config = getAuthConfig()
      const response = await axios.put(`${API_URL}/api/admin/availability/weekly`, {
        weeklySchedule: updatedSchedule
      }, config)
      
      setAvailability(response.data.availability)
    } catch (error) {
      console.error('Error adding time block:', error)
      alert('Failed to add time block')
    }
  }

  const updateTimeBlock = async (day: keyof WeeklySchedule, blockIndex: number, field: 'startTime' | 'endTime', value: string) => {
    if (!availability) return
    
    const updatedTimeBlocks = [...availability.weeklySchedule[day].timeBlocks]
    updatedTimeBlocks[blockIndex] = {
      ...updatedTimeBlocks[blockIndex],
      [field]: value
    }
    
    try {
      const updatedSchedule = {
        ...availability.weeklySchedule,
        [day]: {
          ...availability.weeklySchedule[day],
          timeBlocks: updatedTimeBlocks
        }
      }
      
      const config = getAuthConfig()
      const response = await axios.put(`${API_URL}/api/admin/availability/weekly`, {
        weeklySchedule: updatedSchedule
      }, config)
      
      setAvailability(response.data.availability)
    } catch (error) {
      console.error('Error updating time block:', error)
      alert('Failed to update time block')
    }
  }

  const removeTimeBlock = async (day: keyof WeeklySchedule, blockIndex: number) => {
    if (!availability) return
    
    const updatedTimeBlocks = availability.weeklySchedule[day].timeBlocks.filter((_, index) => index !== blockIndex)
    
    try {
      const updatedSchedule = {
        ...availability.weeklySchedule,
        [day]: {
          ...availability.weeklySchedule[day],
          timeBlocks: updatedTimeBlocks
        }
      }
      
      const config = getAuthConfig()
      const response = await axios.put(`${API_URL}/api/admin/availability/weekly`, {
        weeklySchedule: updatedSchedule
      }, config)
      
      setAvailability(response.data.availability)
    } catch (error) {
      console.error('Error removing time block:', error)
      alert('Failed to remove time block')
    }
  }

  const addDateOverride = async () => {
    if (!newOverride.date) {
      alert('Please select a date')
      return
    }
    
    // Validate time blocks for open overrides
    if (newOverride.type === 'open' && newOverride.timeBlocks.length === 0) {
      alert('Please add at least one time block for open dates')
      return
    }
    
    try {
      const config = getAuthConfig()
      const response = await axios.post(`${API_URL}/api/admin/availability/override`, newOverride, config)
      
      setAvailability(response.data.availability)
      setNewOverride({
        date: '',
        type: 'open',
        timeBlocks: [{ startTime: '09:00', endTime: '17:00' }],
        reason: ''
      })
    } catch (error) {
      console.error('Error adding date override:', error)
      alert('Failed to add date override')
    }
  }

  const addOverrideTimeBlock = () => {
    setNewOverride({
      ...newOverride,
      timeBlocks: [...newOverride.timeBlocks, { startTime: '09:00', endTime: '17:00' }]
    })
  }

  const updateOverrideTimeBlock = (blockIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedTimeBlocks = [...newOverride.timeBlocks]
    updatedTimeBlocks[blockIndex] = {
      ...updatedTimeBlocks[blockIndex],
      [field]: value
    }
    setNewOverride({
      ...newOverride,
      timeBlocks: updatedTimeBlocks
    })
  }

  const removeOverrideTimeBlock = (blockIndex: number) => {
    const updatedTimeBlocks = newOverride.timeBlocks.filter((_, index) => index !== blockIndex)
    setNewOverride({
      ...newOverride,
      timeBlocks: updatedTimeBlocks
    })
  }

  const removeDateOverride = async (date: string) => {
    if (confirm(`Remove availability override for ${date}?`)) {
      try {
        const config = getAuthConfig()
        const response = await axios.delete(`${API_URL}/api/admin/availability/override/${date}`, config)
        
        setAvailability(response.data.availability)
      } catch (error) {
        console.error('Error removing date override:', error)
        alert('Failed to remove date override')
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  // Generate time options with 15-minute intervals for admin scheduling
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = formatTime(timeString)
        options.push({ value: timeString, label: displayTime })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.clientPhone.includes(searchTerm) ||
                         booking.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 flex items-center justify-center">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
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
    <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-tan-900">Sunday Tan Admin</h1>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'bookings', label: 'Bookings' },
            { key: 'clients', label: 'Clients' },
            { key: 'schedule', label: 'Schedule' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'promocodes', label: 'Promocodes' },
            { key: 'stats', label: 'Analytics' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.key 
                  ? 'bg-tan-700 text-white shadow-lg' 
                  : 'bg-white text-tan-700 border border-tan-200 hover:bg-tan-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading dashboard data...</div>
            ) : !stats ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load dashboard data.</p>
                <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <h3 className="text-lg font-medium">This Week</h3>
                    <p className="text-3xl font-bold">{stats.appointments.thisWeek}</p>
                    <p className="text-green-100">completed appointments</p>
                  </div>
                  <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <h3 className="text-lg font-medium">This Month</h3>
                    <p className="text-3xl font-bold">{stats.appointments.thisMonth}</p>
                    <p className="text-blue-100">completed appointments</p>
                  </div>
                  <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <h3 className="text-lg font-medium">This Year</h3>
                    <p className="text-3xl font-bold">{stats.appointments.thisYear}</p>
                    <p className="text-purple-100">completed appointments</p>
                  </div>
                  <div className="card bg-gradient-to-r from-tan-600 to-tan-700 text-white">
                    <h3 className="text-lg font-medium">Total Clients</h3>
                    <p className="text-3xl font-bold">{stats.totalClients}</p>
                    <p className="text-tan-100">registered</p>
                  </div>
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Overview */}
              <div className="card">
                <h3 className="text-xl font-semibold mb-4">Revenue Collected</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">This Week</span>
                    <span className="text-green-600 font-bold">${stats.revenue.thisWeek.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">This Month</span>
                    <span className="text-blue-600 font-bold">${stats.revenue.thisMonth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">This Year</span>
                    <span className="text-purple-600 font-bold">${stats.revenue.thisYear.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Overview */}
              <div className="card">
                <h3 className="text-xl font-semibold mb-4">Expenses</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">This Week</span>
                    <span className="text-red-600 font-bold">-${stats.expenses.thisWeek.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">This Month</span>
                    <span className="text-red-600 font-bold">-${stats.expenses.thisMonth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">This Year</span>
                    <span className="text-red-600 font-bold">-${stats.expenses.thisYear.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="card">
                <h3 className="text-xl font-semibold mb-4">Net Profit</h3>
                <div className="space-y-3">
                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    stats.netRevenue.thisWeek >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <span className="font-medium">This Week</span>
                    <span className={`font-bold ${
                      stats.netRevenue.thisWeek >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      ${stats.netRevenue.thisWeek.toFixed(2)}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    stats.netRevenue.thisMonth >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <span className="font-medium">This Month</span>
                    <span className={`font-bold ${
                      stats.netRevenue.thisMonth >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      ${stats.netRevenue.thisMonth.toFixed(2)}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    stats.netRevenue.thisYear >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <span className="font-medium">This Year</span>
                    <span className={`font-bold ${
                      stats.netRevenue.thisYear >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      ${stats.netRevenue.thisYear.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Best Clients</h3>
              <div className="space-y-2">
                {stats.topClients.slice(0, 5).map((client, index) => (
                  <div 
                    key={client._id} 
                    className="flex justify-between items-center p-3 bg-tan-50 rounded-lg cursor-pointer hover:bg-tan-100 transition-colors"
                    onClick={() => {
                      setActiveTab('clients')
                      fetchClientDetails(client._id)
                    }}
                  >
                    <div>
                      <span className="font-medium">{client.name}</span>
                      <span className="text-sm text-gray-600 ml-2">#{index + 1}</span>
                    </div>
                    <span className="text-tan-700 font-bold">{client.totalAppointments} appointments</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Recent Bookings</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-tan-200">
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Time</th>
                      <th className="text-left py-3 px-2">Client</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-left py-3 px-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map((booking) => (
                      <tr key={booking._id} className="border-b border-tan-100 hover:bg-tan-50">
                        <td className="py-3 px-2">{formatDate(booking.date)}</td>
                        <td className="py-3 px-2">{formatTime(booking.time)}</td>
                        <td className="py-3 px-2">{booking.clientName}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {booking.status === 'completed' && booking.actualRevenue !== null ? (
                            <span className="text-green-600 font-medium text-sm">
                              ${booking.actualRevenue?.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold">All Bookings</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={fetchData} className="btn-secondary whitespace-nowrap">
                    Refresh
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-tan-200">
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Time</th>
                        <th className="text-left py-3 px-2">Client</th>
                        <th className="text-left py-3 px-2">Phone</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Promocode</th>
                        <th className="text-left py-3 px-2">Revenue</th>
                        <th className="text-left py-3 px-2">Notes</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id} className="border-b border-tan-100 hover:bg-tan-50">
                          <td className="py-3 px-2">{formatDate(booking.date)}</td>
                          <td className="py-3 px-2">{formatTime(booking.time)}</td>
                          <td className="py-3 px-2">{booking.clientName}</td>
                          <td className="py-3 px-2">{booking.clientPhone}</td>
                          <td className="py-3 px-2">
                            <select
                              value={booking.status}
                              onChange={(e) => updateBookingStatus(booking._id, e.target.value)}
                              className={`px-2 py-1 rounded text-xs font-medium border-0 ${getStatusColor(booking.status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3 px-2">
                            {booking.promoCode?.code ? (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {booking.promoCode.code}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {booking.status === 'completed' && booking.actualRevenue !== null ? (
                              <span className="text-green-600 font-medium">
                                ${booking.actualRevenue?.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 max-w-xs">
                            {editingNote === booking._id ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  className="flex-1 px-2 py-1 text-xs border border-tan-300 rounded"
                                  placeholder="Add note..."
                                />
                                <button
                                  onClick={() => saveNote(booking._id)}
                                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNote(null)
                                    setNoteText('')
                                  }}
                                  className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 truncate">
                                  {booking.notes || 'No notes'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingNote(booking._id)
                                    setNoteText(booking.notes || '')
                                  }}
                                  className="text-tan-600 hover:text-tan-800 text-xs"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1">
                              {booking.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => approveBooking(booking._id, booking.clientName)}
                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-medium"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => denyBooking(booking._id, booking.clientName)}
                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-medium"
                                  >
                                    Deny
                                  </button>
                                  <button
                                    onClick={() => deleteBooking(booking._id, booking.clientName, formatDate(booking.date), formatTime(booking.time))}
                                    className="px-2 py-1 text-gray-600 hover:text-red-600 text-sm transition-colors"
                                    title="Delete booking"
                                  >
                                    🗑️
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      const client = clients.find(c => c.phone === booking.clientPhone)
                                      if (client) {
                                        fetchClientDetails(client._id)
                                        setActiveTab('clients')
                                      }
                                    }}
                                    className="text-tan-600 hover:text-tan-800 text-xs font-medium"
                                  >
                                    View Client
                                  </button>
                                  <button
                                    onClick={() => deleteBooking(booking._id, booking.clientName, formatDate(booking.date), formatTime(booking.time))}
                                    className="ml-2 px-2 py-1 text-gray-600 hover:text-red-600 text-sm transition-colors"
                                    title="Delete booking"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredBookings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No bookings found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {selectedClient ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="btn-secondary"
                  >
                    ← Back to Clients
                  </button>
                  <h2 className="text-2xl font-semibold">{selectedClient.name}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Client Info */}
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Client Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name</label>
                        <p className="font-medium">{selectedClient.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="font-medium">{selectedClient.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="font-medium">{selectedClient.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Appointments</label>
                        <p className="text-2xl font-bold text-tan-700">{selectedClient.totalAppointments}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Visit</label>
                        <p className="font-medium">{formatDate(selectedClient.lastVisit)}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-tan-200">
                        <button
                          onClick={() => deleteClient(selectedClient._id, selectedClient.name, selectedClient.totalAppointments)}
                          className="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium transition-colors"
                        >
                          🚨 Delete Client & All Bookings
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Appointment History */}
                  <div className="card lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Appointment History</h3>
                    <div className="space-y-3">
                      {selectedClient.appointments.map((appointment, index) => (
                        <div key={index} className="border border-tan-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{formatDate(appointment.date)}</p>
                              {appointment.bookingId && (
                                <div className="flex gap-2 mt-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.bookingId.status)}`}>
                                    {appointment.bookingId.status}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    appointment.bookingId.paymentStatus === 'paid' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {appointment.bookingId.paymentStatus}
                                  </span>
                                  {appointment.bookingId.status === 'completed' && appointment.bookingId.actualRevenue !== null && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Revenue: ${appointment.bookingId.actualRevenue?.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {appointment.bookingId?.notes && (
                            <div className="mt-3 p-3 bg-tan-50 rounded">
                              <p className="text-sm text-gray-700">{appointment.bookingId.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedClient.appointments.length === 0 && (
                        <p className="text-center py-8 text-gray-500">No appointment history</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-semibold">Client Directory</h2>
                  <input
                    type="text"
                    placeholder="Search clients by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 w-full sm:w-80"
                  />
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                      <div
                        key={client._id}
                        className="border border-tan-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => fetchClientDetails(client._id)}
                      >
                        <h3 className="font-semibold text-lg text-tan-900">{client.name}</h3>
                        <p className="text-gray-600 text-sm">{client.phone}</p>
                        <p className="text-gray-600 text-sm">{client.email}</p>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-sm font-medium text-tan-700">
                            {client.totalAppointments} appointments
                          </span>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Last: {formatDate(client.lastVisit)}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Revenue: ${client.appointments.reduce((total, apt) => 
                                total + (apt.bookingId?.actualRevenue || 0), 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {filteredClients.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">No clients found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading availability settings...</div>
            ) : !availability ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load availability settings.</p>
                <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
              </div>
            ) : (
              <>
                {/* Weekly Schedule */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6">Weekly Availability</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(availability.weeklySchedule).map(([day, schedule]) => (
                      <div key={day} className="border border-tan-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium capitalize">{day}</h3>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={schedule.enabled}
                              onChange={(e) => updateWeeklySchedule(day as keyof WeeklySchedule, e.target.checked)}
                              className="mr-2 h-4 w-4 text-tan-600 focus:ring-tan-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Available</span>
                          </label>
                        </div>
                        
                        {schedule.enabled && (
                          <div className="space-y-4">
                            {schedule.timeBlocks.map((block, blockIndex) => (
                              <div key={blockIndex} className="bg-tan-50 border border-tan-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-tan-700">
                                    Time Block {blockIndex + 1}
                                  </span>
                                  {schedule.timeBlocks.length > 1 && (
                                    <button
                                      onClick={() => removeTimeBlock(day as keyof WeeklySchedule, blockIndex)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                                    <select
                                      value={block.startTime}
                                      onChange={(e) => updateTimeBlock(day as keyof WeeklySchedule, blockIndex, 'startTime', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-tan-500"
                                    >
                                      {timeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                                    <select
                                      value={block.endTime}
                                      onChange={(e) => updateTimeBlock(day as keyof WeeklySchedule, blockIndex, 'endTime', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-tan-500"
                                    >
                                      {timeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <button
                              onClick={() => addTimeBlock(day as keyof WeeklySchedule)}
                              className="w-full py-2 text-sm text-tan-600 border border-tan-300 border-dashed rounded-lg hover:bg-tan-50 hover:border-tan-400 transition-colors"
                            >
                              + Add Another Time Block
                            </button>
                          </div>
                        )}
                        
                        {!schedule.enabled && (
                          <p className="text-gray-500 text-sm">Not available on this day</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

            {/* Date Overrides */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Specific Date Overrides</h2>
              
              {/* Add New Override */}
              <div className="border border-tan-200 rounded-lg p-4 mb-6 bg-tan-50">
                <h3 className="text-lg font-medium mb-4">Add Date Override</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newOverride.date}
                      onChange={(e) => setNewOverride({...newOverride, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Override Type *</label>
                    <select
                      value={newOverride.type}
                      onChange={(e) => {
                        const type = e.target.value as 'open' | 'closed'
                        setNewOverride({
                          ...newOverride, 
                          type,
                          timeBlocks: type === 'open' ? [{ startTime: '09:00', endTime: '17:00' }] : []
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                    >
                      <option value="open">✅ Open (Custom hours)</option>
                      <option value="closed">🚫 Closed (Block time)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    value={newOverride.reason}
                    onChange={(e) => setNewOverride({...newOverride, reason: e.target.value})}
                    placeholder={newOverride.type === 'open' ? "e.g., Extended Hours, Special Event" : "e.g., Store Run, Break, Appointment"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  />
                </div>
                
                {newOverride.type === 'open' && (
                  <div className="border-t border-tan-300 pt-4 mt-4">
                    <h4 className="text-md font-medium text-tan-800 mb-3">⏰ Set Custom Hours for This Date</h4>
                    
                    <div className="space-y-3">
                      {newOverride.timeBlocks.map((block, blockIndex) => (
                        <div key={blockIndex} className="bg-white border border-tan-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-tan-700">
                              Time Block {blockIndex + 1}
                            </span>
                            {newOverride.timeBlocks.length > 1 && (
                              <button
                                onClick={() => removeOverrideTimeBlock(blockIndex)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                              <select
                                value={block.startTime}
                                onChange={(e) => updateOverrideTimeBlock(blockIndex, 'startTime', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-tan-500"
                              >
                                {timeOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                              <select
                                value={block.endTime}
                                onChange={(e) => updateOverrideTimeBlock(blockIndex, 'endTime', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-tan-500"
                              >
                                {timeOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={addOverrideTimeBlock}
                        className="w-full py-2 text-sm text-tan-600 border border-tan-300 border-dashed rounded-lg hover:bg-tan-50 hover:border-tan-400 transition-colors"
                      >
                        + Add Another Time Block
                      </button>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Preview:</strong> On {newOverride.date ? new Date(newOverride.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'this date'}, 
                        appointments will be available during{' '}
                        {newOverride.timeBlocks.map((block, index) => (
                          <span key={index}>
                            {formatTime(block.startTime)} - {formatTime(block.endTime)}
                            {index < newOverride.timeBlocks.length - 1 ? ', ' : ''}
                          </span>
                        ))}.
                      </p>
                    </div>
                  </div>
                )}

                {newOverride.type === 'closed' && (
                  <div className="border-t border-red-300 pt-4 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        🚫 <strong>Closed Override:</strong> This will completely block appointments on {newOverride.date ? new Date(newOverride.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'this date'}.
                        {newOverride.reason && ` Reason: ${newOverride.reason}`}
                      </p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={addDateOverride}
                  className="mt-4 btn-primary"
                >
                  Add Override
                </button>
              </div>

              {/* Existing Overrides */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Current Overrides</h3>
                {availability.dateOverrides.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No date overrides set</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availability.dateOverrides
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((override) => (
                        <div key={override.date} className={`border rounded-lg p-4 ${override.type === 'open' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-lg">{formatDate(override.date)}</p>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                {new Date(override.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                              </p>
                            </div>
                            <button
                              onClick={() => removeDateOverride(override.date)}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-100 transition-colors"
                              title="Remove this override"
                            >
                              🗑️ Remove
                            </button>
                          </div>
                          
                          <div className="mb-2">
                            {override.type === 'open' ? (
                              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  <span className="text-green-600 font-medium">✅ Open</span>
                                </div>
                                {override.timeBlocks && override.timeBlocks.length > 0 ? (
                                  <div className="space-y-2">
                                    {override.timeBlocks.map((block, blockIndex) => (
                                      <p key={blockIndex} className="text-sm text-green-700 font-medium">
                                        ⏰ {formatTime(block.startTime)} - {formatTime(block.endTime)}
                                      </p>
                                    ))}
                                    <p className="text-xs text-green-600 mt-1">
                                      Clients can book appointments during these hours
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-green-600">
                                    Custom hours (time blocks not configured)
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                                <div className="flex items-center">
                                  <span className="text-red-600 font-medium">🚫 Closed</span>
                                </div>
                                <p className="text-xs text-red-600 mt-1">
                                  No appointments available on this date
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {override.reason && (
                            <div className="bg-tan-100 border border-tan-200 rounded-lg p-2 mt-2">
                              <p className="text-sm text-tan-800">
                                <span className="font-medium">Reason:</span> {override.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : (
              <>
                {/* Add New Expense */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6">Add New Expense</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                      <input
                        type="text"
                        value={newExpense.item}
                        onChange={(e) => setNewExpense({...newExpense, item: e.target.value})}
                        placeholder="e.g., Tanning Solution, Equipment, Supplies"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpense.cost}
                        onChange={(e) => setNewExpense({...newExpense, cost: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      >
                        <option value="General">General</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      placeholder="Additional details about this expense"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                    />
                  </div>
                  <button
                    onClick={addExpense}
                    className="btn-primary"
                  >
                    Add Expense
                  </button>
                </div>

                {/* Expenses List */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6">Recent Expenses</h2>
                  {expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No expenses recorded yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-tan-200">
                            <th className="text-left py-3 px-2">Date</th>
                            <th className="text-left py-3 px-2">Item</th>
                            <th className="text-left py-3 px-2">Category</th>
                            <th className="text-left py-3 px-2">Cost</th>
                            <th className="text-left py-3 px-2">Notes</th>
                            <th className="text-left py-3 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((expense) => (
                            <tr key={expense._id} className="border-b border-tan-100 hover:bg-tan-50">
                              <td className="py-3 px-2">
                                {new Date(expense.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2 font-medium">{expense.item}</td>
                              <td className="py-3 px-2">
                                <span className="px-2 py-1 bg-tan-100 text-tan-800 rounded text-xs">
                                  {expense.category}
                                </span>
                              </td>
                              <td className="py-3 px-2 font-bold text-red-600">
                                ${expense.cost.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-gray-600 max-w-xs truncate">
                                {expense.notes || '-'}
                              </td>
                              <td className="py-3 px-2">
                                <button
                                  onClick={() => deleteExpense(expense._id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                  title="Delete expense"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-tan-300 font-bold">
                            <td colSpan={3} className="py-3 px-2 text-right">Total Expenses:</td>
                            <td className="py-3 px-2 text-red-600 text-lg">
                              ${expenses.reduce((sum, exp) => sum + exp.cost, 0).toFixed(2)}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Promocodes Tab */}
        {activeTab === 'promocodes' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading promocodes...</div>
            ) : (
              <>
                {/* Add New Promocode */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6">Create New Promocode</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                      <input
                        type="text"
                        value={newPromoCode.code}
                        onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                        placeholder="e.g., WELCOME10, SAVE25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <input
                        type="text"
                        value={newPromoCode.description}
                        onChange={(e) => setNewPromoCode({...newPromoCode, description: e.target.value})}
                        placeholder="e.g., Welcome discount, Holiday special"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                      <select
                        value={newPromoCode.discountType}
                        onChange={(e) => setNewPromoCode({...newPromoCode, discountType: e.target.value as 'fixed' | 'percentage'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      >
                        <option value="fixed">Fixed Amount ($)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Value {newPromoCode.discountType === 'fixed' ? '($)' : '(%)'}
                      </label>
                      <input
                        type="number"
                        step={newPromoCode.discountType === 'fixed' ? '0.01' : '1'}
                        min="0"
                        max={newPromoCode.discountType === 'fixed' ? '1000' : '100'}
                        value={newPromoCode.discountValue}
                        onChange={(e) => setNewPromoCode({...newPromoCode, discountValue: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit (Optional)</label>
                      <input
                        type="number"
                        min="1"
                        value={newPromoCode.usageLimit}
                        onChange={(e) => setNewPromoCode({...newPromoCode, usageLimit: e.target.value})}
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={newPromoCode.validUntil}
                        onChange={(e) => setNewPromoCode({...newPromoCode, validUntil: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Preview</h4>
                    <p className="text-sm text-blue-700">
                      Code <strong>{newPromoCode.code || 'CODE'}</strong> will give customers{' '}
                      {newPromoCode.discountType === 'fixed' 
                        ? `$${newPromoCode.discountValue?.toFixed(2) || '0.00'} off`
                        : `${newPromoCode.discountValue || 0}% off`
                      } their deposit{newPromoCode.discountValue >= 10 && newPromoCode.discountType === 'fixed' ? ' (waiving the $10 deposit entirely)' : ''}.
                      {newPromoCode.usageLimit && ` Limited to ${newPromoCode.usageLimit} uses.`}
                      {newPromoCode.validUntil && ` Expires on ${new Date(newPromoCode.validUntil).toLocaleDateString()}.`}
                    </p>
                  </div>

                  <button
                    onClick={addPromoCode}
                    className="btn-primary"
                  >
                    Create Promocode
                  </button>
                </div>

                {/* Promocodes List */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6">Active Promocodes</h2>
                  {promoCodes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No promocodes created yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-tan-200">
                            <th className="text-left py-3 px-2">Code</th>
                            <th className="text-left py-3 px-2">Description</th>
                            <th className="text-left py-3 px-2">Discount</th>
                            <th className="text-left py-3 px-2">Usage</th>
                            <th className="text-left py-3 px-2">Status</th>
                            <th className="text-left py-3 px-2">Expires</th>
                            <th className="text-left py-3 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promoCodes.map((promoCode) => (
                            <tr key={promoCode._id} className="border-b border-tan-100 hover:bg-tan-50">
                              <td className="py-3 px-2">
                                <span className="font-bold text-tan-800 bg-tan-100 px-2 py-1 rounded">
                                  {promoCode.code}
                                </span>
                              </td>
                              <td className="py-3 px-2">{promoCode.description}</td>
                              <td className="py-3 px-2">
                                <span className="font-medium">
                                  {promoCode.discountType === 'fixed' 
                                    ? `$${promoCode.discountValue.toFixed(2)}`
                                    : `${promoCode.discountValue}%`
                                  }
                                </span>
                                {promoCode.discountValue >= 10 && promoCode.discountType === 'fixed' && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Waives Deposit
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <span className="text-sm">
                                  {promoCode.usageCount}{promoCode.usageLimit ? `/${promoCode.usageLimit}` : ''}
                                  {promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit && (
                                    <span className="ml-1 text-red-600 font-medium">(Max Reached)</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <button
                                  onClick={() => updatePromoCode(promoCode._id, { isActive: !promoCode.isActive })}
                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                    promoCode.isActive
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                >
                                  {promoCode.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="py-3 px-2 text-sm">
                                {promoCode.validUntil 
                                  ? new Date(promoCode.validUntil).toLocaleDateString()
                                  : 'Never'
                                }
                                {promoCode.validUntil && new Date(promoCode.validUntil) < new Date() && (
                                  <span className="ml-1 text-red-600 font-medium">(Expired)</span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <button
                                  onClick={() => deletePromoCode(promoCode._id, promoCode.code)}
                                  className="text-red-600 hover:text-red-800 text-sm mr-2"
                                  title="Delete promocode"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading analytics data...</div>
            ) : !stats ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load analytics data.</p>
                <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
              </div>
            ) : (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">Business Analytics</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appointment Trends */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Appointment Trends</h3>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Week</span>
                        <span className="text-2xl font-bold text-green-600">{stats.appointments.thisWeek}</span>
                      </div>
                      <p className="text-sm text-green-700">Revenue: ${stats.revenue.thisWeek}</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Month</span>
                        <span className="text-2xl font-bold text-blue-600">{stats.appointments.thisMonth}</span>
                      </div>
                      <p className="text-sm text-blue-700">Revenue: ${stats.revenue.thisMonth}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Year</span>
                        <span className="text-2xl font-bold text-purple-600">{stats.appointments.thisYear}</span>
                      </div>
                      <p className="text-sm text-purple-700">Revenue: ${stats.revenue.thisYear}</p>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Booking Status Overview</h3>
                  <div className="space-y-3">
                    {stats.statusBreakdown.map((status) => (
                      <div key={status._id} className="flex justify-between items-center p-3 bg-tan-50 rounded-lg">
                        <span className="font-medium capitalize">{status._id}</span>
                        <span className="text-lg font-bold text-tan-700">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Clients Table */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Best Clients (Most Appointments)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-tan-200">
                        <th className="text-left py-3">Rank</th>
                        <th className="text-left py-3">Client Name</th>
                        <th className="text-left py-3">Phone</th>
                        <th className="text-left py-3">Total Appointments</th>
                        <th className="text-left py-3">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topClients.map((client, index) => (
                        <tr 
                          key={client._id} 
                          className="border-b border-tan-100 hover:bg-tan-50 cursor-pointer"
                          onClick={() => {
                            fetchClientDetails(client._id)
                            setActiveTab('clients')
                          }}
                        >
                          <td className="py-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-tan-700 text-white rounded-full text-sm font-bold">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 font-medium">{client.name}</td>
                          <td className="py-3 text-gray-600">{client.phone}</td>
                          <td className="py-3">
                            <span className="text-lg font-bold text-tan-700">{client.totalAppointments}</span>
                          </td>
                          <td className="py-3 text-gray-600">{formatDate(client.lastVisit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Revenue Collection Modal */}
        {showRevenueModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Collect Revenue</h3>
              <p className="text-gray-600 mb-4">
                How much money did you collect for this completed appointment?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRevenueModal(null)
                    setRevenueInput('')
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevenueSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete Appointment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}