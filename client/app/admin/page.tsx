'use client';

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
  appliedPromoCodes?: Array<{
    code: string;
    type: 'regular' | 'referral';
    discountAmount: number;
  }>;
  totalPromoDiscount?: number;
  additionalDiscount?: number;
  referralId?: string;
  notes?: string;
  actualRevenue?: number;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundId?: string;
  cancellationToken?: string;
  createdAt: string;
  membershipApplied?: boolean;
  membershipType?: 'included' | 'additional';
  membershipChargeAmount?: number;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  totalAppointments: number;
  lastVisit: string;
  hasActiveMembership?: boolean;
  membershipStatus?: string;
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
  usageType: 'unlimited' | 'total_limit' | 'once_per_client';
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
  serviceRevenue: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  membershipRevenue: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    subscription: {
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
    additionalTans: {
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
    tips?: {
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
  };
  membershipStats: {
    activeMembers: number;
    mrr: number;
    averageRevenuePerMember: number;
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
  monthlyCompletedTans: Array<{
    month: number;
    count: number;
  }>;
  yearlyCompletedTans: Array<{
    year: number;
    count: number;
  }>;
  dayOfWeekStats: Array<{
    day: string;
    dayNumber: number;
    count: number;
  }>;
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

interface Referral {
  _id: string;
  referrerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  referredPhone: string;
  friendName: string;
  referralCode: string;
  status: 'sent' | 'scheduled' | 'completed' | 'used_for_membership' | 'cancelled';
  referrerRewardType?: 'membership_discount' | 'tan_discount';
  referrerRewardAmount?: number;
  rewardApplied?: boolean;
  smsSentAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface ReferralAnalytics {
  totalReferrals: number;
  completedReferrals: number;
  membershipSignups: number;
  conversionRate: number;
  membershipConversionRate: number;
  totalRevenueFromReferrals: number;
  totalDiscountsGiven: number;
  topReferrers: Array<{
    user: {
      name: string;
      email: string;
      phone: string;
    };
    referralCount: number;
    completedCount: number;
    revenue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    sent: number;
    completed: number;
    revenue: number;
  }>;
  statusBreakdown: {
    sent: number;
    scheduled: number;
    completed: number;
    used_for_membership: number;
    cancelled: number;
  };
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'clients' | 'schedule' | 'expenses' | 'stats' | 'promocodes' | 'referrals'>('dashboard')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
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
  const [tipInput, setTipInput] = useState('')
  const [showRevenueModal, setShowRevenueModal] = useState<string | null>(null)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly')
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    description: '',
    discountType: 'fixed' as 'fixed' | 'percentage',
    discountValue: 10,
    usageType: 'unlimited' as 'unlimited' | 'total_limit' | 'once_per_client',
    usageLimit: '',
    validUntil: ''
  })
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralAnalytics, setReferralAnalytics] = useState<ReferralAnalytics | null>(null)
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('all')
  const [referralSearch, setReferralSearch] = useState('')
  const [showManualBookingModal, setShowManualBookingModal] = useState(false)
  const [manualBookingDate, setManualBookingDate] = useState('')
  const [manualBookingHour, setManualBookingHour] = useState('')
  const [manualBookingMinute, setManualBookingMinute] = useState('00')
  const [manualBookingPeriod, setManualBookingPeriod] = useState<'AM' | 'PM'>('AM')
  const [manualBookingNotes, setManualBookingNotes] = useState('')

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

  const getAuthConfig = () => {
    const token = Cookies.get('adminToken')
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const config = getAuthConfig()
      
      const [bookingsRes, clientsRes, statsRes, availabilityRes, expensesRes, promoCodesRes, referralsRes, referralAnalyticsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/bookings`, config),
        axios.get(`${API_URL}/api/admin/clients`, config),
        axios.get(`${API_URL}/api/admin/stats`, config),
        axios.get(`${API_URL}/api/admin/availability`, config),
        axios.get(`${API_URL}/api/admin/expenses`, config),
        axios.get(`${API_URL}/api/admin/promocodes`, config).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/admin/referrals`, config).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/admin/referrals/analytics`, config).catch(() => ({ data: null }))
      ])
      
      setBookings(bookingsRes.data || [])
      setClients(clientsRes.data || [])
      setStats(statsRes.data)
      setAvailability(availabilityRes.data)
      setExpenses(expensesRes.data || [])
      setPromoCodes(promoCodesRes.data || [])
      setReferrals(referralsRes.data || [])
      setReferralAnalytics(referralAnalyticsRes.data)
      
    } catch (error) {
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
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    // Find the booking to check if it has membership
    const booking = bookings.find(b => b._id === bookingId)
    
    // If changing to completed, show revenue modal
    if (status === 'completed') {
      setShowRevenueModal(bookingId)
      return
    }
    
    // If this is a member booking and status is changing from completed, show warning
    if (booking?.membershipApplied && booking.status === 'completed' && status !== 'completed') {
      if (!confirm('This booking used a membership tan. Changing the status from "completed" will refund the tan usage to the member. Continue?')) {
        return
      }
    }
    
    // If this is a member booking and status is changing to completed, show info
    if (booking?.membershipApplied && booking.status !== 'completed' && status === 'completed') {
      if (!confirm(`This will count as ${booking.membershipType === 'included' ? 'an included tan' : 'an additional tan ($' + booking.membershipChargeAmount + ')'} against the member's monthly allowance. Continue?`)) {
        return
      }
    }
    
    try {
      const config = getAuthConfig()
      await axios.patch(`${API_URL}/api/admin/bookings/${bookingId}`, { status }, config)
      fetchData()
    } catch (error) {
      alert('Failed to update booking status')
    }
  }

  const handleRevenueSubmit = async () => {
    if (!showRevenueModal) return
    
    const booking = bookings.find(b => b._id === showRevenueModal)
    
    // For member bookings, we handle tip amount
    if (booking?.membershipApplied) {
      const tip = tipInput === '' ? 0 : parseFloat(tipInput)
      if (isNaN(tip) || tip < 0) {
        alert('Please enter a valid tip amount (0 or higher)')
        return
      }
      
      try {
        const config = getAuthConfig()
        await axios.patch(`${API_URL}/api/admin/bookings/${showRevenueModal}`, {
          status: 'completed',
          tipAmount: tip
        }, config)
        
        setShowRevenueModal(null)
        setTipInput('')
        fetchData()
      } catch (error) {
        alert('Failed to mark appointment as completed')
      }
    } else {
      // Non-member bookings use appointment revenue input (excluding deposit)
      const appointmentRevenue = revenueInput === '' ? 0 : parseFloat(revenueInput)
      if (isNaN(appointmentRevenue) || appointmentRevenue < 0) {
        alert('Please enter a valid revenue amount (0 or higher)')
        return
      }

      try {
        const config = getAuthConfig()
        await axios.patch(`${API_URL}/api/admin/bookings/${showRevenueModal}`, {
          status: 'completed',
          appointmentRevenue: appointmentRevenue  // Send appointment revenue, backend will calculate total
        }, config)
        
        setShowRevenueModal(null)
        setRevenueInput('')
        fetchData()
      } catch (error) {
        alert('Failed to mark appointment as completed')
      }
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
        alert('Failed to delete expense')
      }
    }
  }

  const createManualBooking = async () => {
    if (!manualBookingDate || !manualBookingHour) {
      alert('Please select a date and time')
      return
    }

    // Convert 12-hour format to 24-hour format
    let hour24 = parseInt(manualBookingHour)
    if (manualBookingPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (manualBookingPeriod === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    
    const time24 = `${hour24.toString().padStart(2, '0')}:${manualBookingMinute}`

    try {
      const config = getAuthConfig()
      const response = await axios.post(`${API_URL}/api/admin/manual-booking`, {
        date: manualBookingDate,
        time: time24,
        notes: manualBookingNotes || 'Manual booking created by admin'
      }, config)
      
      alert('Manual booking created successfully!')
      setShowManualBookingModal(false)
      setManualBookingDate('')
      setManualBookingHour('')
      setManualBookingMinute('00')
      setManualBookingPeriod('AM')
      setManualBookingNotes('')
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create manual booking')
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
        usageLimit: newPromoCode.usageType === 'total_limit' && newPromoCode.usageLimit ? parseInt(newPromoCode.usageLimit) : null,
        validUntil: newPromoCode.validUntil || null
      }
      
      await axios.post(`${API_URL}/api/admin/promocodes`, data, config)
      
      setNewPromoCode({
        code: '',
        description: '',
        discountType: 'fixed',
        discountValue: 10,
        usageType: 'unlimited',
        usageLimit: '',
        validUntil: ''
      })
      fetchData()
    } catch (error) {
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
        alert('Failed to deny booking')
      }
    }
  }

  const deleteBooking = async (bookingId: string, clientName: string, date: string, time: string) => {
    if (confirm(`⚠️ PERMANENT DELETE ⚠️\n\nAre you sure you want to permanently delete this booking?\n\nClient: ${clientName}\nDate: ${date}\nTime: ${time}\n\nThis action CANNOT be undone!`)) {
      try {
        const config = getAuthConfig()
        
        const response = await axios.delete(`${API_URL}/api/admin/bookings/${bookingId}`, config)
        
        alert(response.data.message)
        
        // If we're in the client details view, update the selectedClient immediately
        if (selectedClient) {
          const updatedAppointments = selectedClient.appointments.filter(
            apt => apt.bookingId?._id !== bookingId
          )
          setSelectedClient({
            ...selectedClient,
            appointments: updatedAppointments,
            totalAppointments: Math.max(0, selectedClient.totalAppointments - 1)
          })
        }
        
        fetchData()
      } catch (error: any) {
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
        
        const response = await axios.delete(`${API_URL}/api/admin/clients/${clientId}`, config)
        
        alert(response.data.message)
        fetchData()
        
        // If we're viewing this client's details, go back to client list
        if (selectedClient && selectedClient._id === clientId) {
          setSelectedClient(null)
        }
      } catch (error: any) {
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
        alert('Failed to remove date override')
      }
    }
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Never'
    
    // Handle Date object or ISO string
    if (dateString instanceof Date || dateString.includes('T')) {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid Date'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Parse date string as local date, not UTC (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
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

  const filteredBookings = bookings
    .filter(booking => {
      const matchesSearch = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           booking.clientPhone.includes(searchTerm) ||
                           booking.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !statusFilter || booking.status === statusFilter
      // Hide completed bookings unless showCompleted is true
      const matchesCompleted = showCompleted || booking.status !== 'completed'
      return matchesSearch && matchesStatus && matchesCompleted
    })
    .sort((a, b) => {
      // Sort by date and time chronologically (nearest appointments first)
      const dateA = new Date(`${a.date} ${a.time}`)
      const dateB = new Date(`${b.date} ${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

  const filteredClients = clients
    .filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Extract last names (assume last word is last name)
      const getLastName = (fullName: string) => {
        const parts = fullName.trim().split(' ')
        return parts[parts.length - 1] || fullName
      }
      
      const lastNameA = getLastName(a.name)
      const lastNameB = getLastName(b.name)
      
      // Sort by last name first
      const lastNameCompare = lastNameA.localeCompare(lastNameB)
      if (lastNameCompare !== 0) return lastNameCompare
      
      // If last names are the same, sort by full name
      return a.name.localeCompare(b.name)
    })

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tan-50 to-tan-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-semibold text-tan-900">Admin Login</h1>
            <p className="text-tan-600 mt-2">Enter your password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-tan-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:ring-2 focus:ring-tan-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-tan-700 text-white py-3 rounded-lg hover:bg-tan-800 transition-colors font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
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
            { key: 'referrals', label: 'Referrals' },
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

            {/* Membership Analytics */}
            <div className="card col-span-1 lg:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Membership Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Active Members</span>
                    <span className="text-2xl font-bold text-purple-900">{stats.membershipStats?.activeMembers || 0}</span>
                  </div>
                  <div className="text-xs text-purple-600">
                    Monthly Recurring Revenue
                  </div>
                  <div className="text-lg font-bold text-purple-800">
                    ${stats.membershipStats?.mrr?.toFixed(2) || '0.00'}/mo
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                  <div className="text-sm font-medium text-indigo-700 mb-2">Membership Revenue</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-indigo-600">Subscriptions:</span>
                      <span className="text-sm font-bold text-indigo-800">
                        ${stats.membershipRevenue?.subscription?.thisMonth?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-indigo-600">Additional Tans:</span>
                      <span className="text-sm font-bold text-indigo-800">
                        ${stats.membershipRevenue?.additionalTans?.thisMonth?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-indigo-600">Tips:</span>
                      <span className="text-sm font-bold text-indigo-800">
                        ${stats.membershipRevenue?.tips?.thisMonth?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="border-t border-indigo-300 pt-1 mt-1">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium text-indigo-700">Total:</span>
                        <span className="text-sm font-bold text-indigo-900">
                          ${stats.membershipRevenue?.thisMonth?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                  <div className="text-sm font-medium text-emerald-700 mb-2">Revenue Breakdown</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600">Service Revenue:</span>
                      <span className="text-sm font-bold text-emerald-800">
                        ${stats.serviceRevenue?.thisMonth?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600">Membership Revenue:</span>
                      <span className="text-sm font-bold text-emerald-800">
                        ${stats.membershipRevenue?.thisMonth?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                        <div 
                          className="bg-emerald-500" 
                          style={{
                            width: `${stats.serviceRevenue && stats.membershipRevenue 
                              ? (stats.serviceRevenue.thisMonth / (stats.serviceRevenue.thisMonth + stats.membershipRevenue.thisMonth) * 100)
                              : 100}%`
                          }}
                        />
                        <div 
                          className="bg-purple-500"
                          style={{
                            width: `${stats.serviceRevenue && stats.membershipRevenue 
                              ? (stats.membershipRevenue.thisMonth / (stats.serviceRevenue.thisMonth + stats.membershipRevenue.thisMonth) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-emerald-600">Service</span>
                        <span className="text-purple-600">Membership</span>
                      </div>
                    </div>
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
            {/* Mobile-First Header */}
            <div className="card">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">All Bookings</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowManualBookingModal(true)}
                      className="px-4 py-2 bg-tan-600 text-white rounded-lg hover:bg-tan-700 transition-colors font-medium"
                    >
                      + Quick Booking
                    </button>
                    <button onClick={fetchData} className="p-2 text-tan-600 hover:bg-tan-100 rounded-lg transition-colors" title="Refresh">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search client name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                />
                
                {/* Filter Pills */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setStatusFilter('')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === '' ? 'bg-tan-600 text-white' : 'bg-tan-100 text-tan-700 hover:bg-tan-200'
                    }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === 'pending' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    Pending ({bookings.filter(b => b.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('confirmed')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === 'confirmed' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === 'completed' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    Completed ({bookings.filter(b => b.status === 'completed').length})
                  </button>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      showCompleted 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showCompleted ? '👁️ Showing All' : '👁️‍🗨️ Hide Completed'}
                  </button>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                {/* Mobile Cards View (hidden on md and up) */}
                <div className="md:hidden space-y-4">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No bookings found</div>
                  ) : (
                    <>
                      {/* Group bookings by date */}
                      {Object.entries(
                        filteredBookings.reduce((groups, booking) => {
                          const date = formatDate(booking.date)
                          if (!groups[date]) groups[date] = []
                          groups[date].push(booking)
                          return groups
                        }, {} as Record<string, typeof filteredBookings>)
                      ).map(([date, dateBookings]) => (
                        <div key={date}>
                          <div className="sticky top-0 bg-tan-50 px-4 py-2 mb-3 rounded-lg">
                            <h3 className="font-semibold text-tan-800">{date}</h3>
                          </div>
                          {dateBookings.map((booking) => (
                            <div key={booking._id} className="bg-white rounded-lg shadow-sm border border-tan-200 p-4 mb-3">
                              {/* Card Header */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-lg">{booking.clientName}</span>
                                    {booking.membershipApplied && (
                                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                        Member
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="font-medium">{formatTime(booking.time)}</span>
                                    <a href={`tel:${booking.clientPhone}`} className="text-tan-600 hover:text-tan-800">
                                      {booking.clientPhone}
                                    </a>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {/* Status Badge */}
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    booking.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                    booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                  {booking.status === 'completed' && booking.actualRevenue !== null && (
                                    <span className="text-green-600 font-semibold">
                                      ${booking.actualRevenue.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Promo and Membership Info */}
                              {(booking.appliedPromoCodes?.length || booking.promoCode?.code || booking.membershipApplied) && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {booking.appliedPromoCodes?.map((promo, idx) => (
                                    <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${
                                      promo.type === 'referral' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {promo.code} (-${promo.discountAmount})
                                    </span>
                                  ))}
                                  {booking.promoCode?.code && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {booking.promoCode.code}
                                    </span>
                                  )}
                                  {booking.membershipApplied && (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      booking.membershipType === 'included' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {booking.membershipType === 'included' 
                                        ? '✓ Included Tan' 
                                        : `+$${booking.membershipChargeAmount} Additional`}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Notes */}
                              {booking.notes && (
                                <div className="bg-gray-50 rounded p-2 mb-3">
                                  <p className="text-sm text-gray-600">{booking.notes}</p>
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                {booking.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Approve booking for ${booking.clientName}?`)) {
                                          approveBooking(booking._id, booking.clientName)
                                        }
                                      }}
                                      className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Deny booking for ${booking.clientName}?`)) {
                                          denyBooking(booking._id, booking.clientName)
                                        }
                                      }}
                                      className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                                    >
                                      ✗ Deny
                                    </button>
                                  </>
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={() => setShowRevenueModal(booking._id)}
                                    className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                                  >
                                    ✓ Complete Appointment
                                  </button>
                                )}
                                {booking.status === 'completed' && (
                                  <button
                                    onClick={() => {
                                      const client = clients.find(c => c.phone === booking.clientPhone)
                                      if (client) {
                                        fetchClientDetails(client._id)
                                        setActiveTab('clients')
                                      }
                                    }}
                                    className="flex-1 py-2.5 bg-tan-500 text-white rounded-lg font-medium hover:bg-tan-600 transition-colors"
                                  >
                                    View Client Details
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingNote(booking._id)
                                    setNoteText(booking.notes || '')
                                  }}
                                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                  {booking.notes ? 'Edit' : 'Add'} Note
                                </button>
                              </div>
                              
                              {/* Note Editing */}
                              {editingNote === booking._id && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Add a note..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                                    rows={3}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => saveNote(booking._id)}
                                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingNote(null)
                                        setNoteText('')
                                      }}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                
                {/* Desktop Table View (hidden on mobile) */}
                <div className="hidden md:block card">
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
                          <th className="text-left py-3 px-2">Cancellation</th>
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
                            <div className="flex flex-col gap-1">
                              {/* Show only first promocode (limiting to one) */}
                              {booking.appliedPromoCodes && booking.appliedPromoCodes.length > 0 ? (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  booking.appliedPromoCodes[0].type === 'referral' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {booking.appliedPromoCodes[0].code}
                                </span>
                              ) : booking.promoCode?.code ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  {booking.promoCode.code}
                                </span>
                              ) : null}
                              
                              {booking.membershipApplied && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  booking.membershipType === 'included' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {booking.membershipType === 'included' 
                                    ? '✓ Member (Included)' 
                                    : `✓ Member ($${booking.membershipChargeAmount})`}
                                </span>
                              )}
                              
                              {/* Additional discount removed - keeping code for future stackable implementation */}
                              
                              {!booking.appliedPromoCodes?.length && !booking.promoCode?.code && !booking.membershipApplied && (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
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
                          <td className="py-3 px-2">
                            {booking.status === 'cancelled' && booking.cancelledAt ? (
                              <div className="text-xs">
                                <div className="text-red-600 font-medium">
                                  Cancelled {new Date(booking.cancelledAt).toLocaleDateString()}
                                </div>
                                {booking.refundStatus && booking.refundStatus !== 'none' && (
                                  <div className={`mt-1 ${
                                    booking.refundStatus === 'processed' ? 'text-green-600' :
                                    booking.refundStatus === 'failed' ? 'text-red-600' :
                                    booking.refundStatus === 'not_applicable' ? 'text-blue-600' :
                                    'text-orange-600'
                                  }`}>
                                    Refund: {booking.refundStatus === 'processed' ? `$${booking.refundAmount?.toFixed(2)} processed` :
                                           booking.refundStatus === 'failed' ? 'Failed' :
                                           booking.refundStatus === 'not_applicable' ? 'N/A (promo)' :
                                           'Pending'}
                                  </div>
                                )}
                              </div>
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
                      {filteredBookings.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-gray-500">No bookings found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
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
                      {selectedClient.appointments
                        .filter(appointment => appointment.bookingId) // Only show appointments with actual booking data
                        .map((appointment, index) => (
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
                            {appointment.bookingId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteBooking(
                                    appointment.bookingId._id,
                                    selectedClient.name,
                                    formatDate(appointment.date),
                                    (appointment.bookingId as any)?.time || 'N/A'
                                  )
                                }}
                                className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                                title="Delete this appointment"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          
                          {/* Notes Section */}
                          <div className="mt-3">
                            {editingNote === appointment.bookingId?._id ? (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-600">Notes:</label>
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 resize-none"
                                  rows={3}
                                  placeholder="Add notes about this appointment..."
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveNote(appointment.bookingId._id)}
                                    className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingNote(null)
                                      setNoteText('')
                                    }}
                                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {appointment.bookingId?.notes ? (
                                  <div className="p-3 bg-tan-50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-xs font-medium text-gray-600 mb-1">Notes:</p>
                                        <p className="text-sm text-gray-700">{appointment.bookingId.notes}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setEditingNote(appointment.bookingId._id)
                                          setNoteText(appointment.bookingId.notes || '')
                                        }}
                                        className="ml-2 text-tan-600 hover:text-tan-800 text-xs font-medium"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (appointment.bookingId) {
                                        setEditingNote(appointment.bookingId._id)
                                        setNoteText('')
                                      }
                                    }}
                                    className="text-tan-600 hover:text-tan-800 text-sm font-medium"
                                  >
                                    + Add Notes
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedClient.appointments.filter(apt => apt.bookingId).length === 0 && (
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
                        className="border border-tan-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                        onClick={() => fetchClientDetails(client._id)}
                      >
                        {client.hasActiveMembership && (
                          <div className="absolute top-2 right-2" title="Active Membership">
                            <span className="text-green-500 text-xl">⭐</span>
                          </div>
                        )}
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
                          timeBlocks: [] // Clear time blocks when changing type
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-700">
                        🚫 <strong>Blocked Override:</strong> Choose specific time periods to block on {newOverride.date ? new Date(newOverride.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'this date'}, or leave empty to block the entire day.
                        {newOverride.reason && ` Reason: ${newOverride.reason}`}
                      </p>
                    </div>
                    
                    {/* Time blocks for blocking specific periods */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Blocked Time Periods</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setNewOverride({
                              ...newOverride,
                              timeBlocks: [...newOverride.timeBlocks, { startTime: '09:00', endTime: '17:00' }]
                            })
                          }}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                        >
                          + Add Blocked Period
                        </button>
                      </div>
                      
                      {newOverride.timeBlocks.length === 0 ? (
                        <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm text-red-600">No time periods specified - entire day will be blocked</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {newOverride.timeBlocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-red-700">Block From</label>
                                  <input
                                    type="time"
                                    value={block.startTime}
                                    onChange={(e) => {
                                      const updatedBlocks = [...newOverride.timeBlocks]
                                      updatedBlocks[blockIndex].startTime = e.target.value
                                      setNewOverride({ ...newOverride, timeBlocks: updatedBlocks })
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-red-700">Block Until</label>
                                  <input
                                    type="time"
                                    value={block.endTime}
                                    onChange={(e) => {
                                      const updatedBlocks = [...newOverride.timeBlocks]
                                      updatedBlocks[blockIndex].endTime = e.target.value
                                      setNewOverride({ ...newOverride, timeBlocks: updatedBlocks })
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedBlocks = newOverride.timeBlocks.filter((_, idx) => idx !== blockIndex)
                                  setNewOverride({ ...newOverride, timeBlocks: updatedBlocks })
                                }}
                                className="text-red-600 hover:text-red-800 p-2"
                                title="Remove this time block"
                              >
                                <span className="text-xl">×</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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
                                <div className="flex items-center mb-2">
                                  <span className="text-red-600 font-medium">🚫 Blocked</span>
                                </div>
                                {override.timeBlocks && override.timeBlocks.length > 0 ? (
                                  <div className="space-y-2">
                                    {override.timeBlocks.map((block, blockIndex) => (
                                      <p key={blockIndex} className="text-sm text-red-700 font-medium">
                                        ⏰ {formatTime(block.startTime)} - {formatTime(block.endTime)}
                                      </p>
                                    ))}
                                    <p className="text-xs text-red-600 mt-1">
                                      Appointments blocked during these times only
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-red-600 mt-1">
                                    No appointments available on this date (entire day blocked)
                                  </p>
                                )}
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
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> This section is for regular promocodes only. 
                      Referral codes (REF-XXXXX) are automatically generated and managed in the Referrals tab.
                      Codes cannot start with "REF-" or "REWARD-" as these are reserved for the referral system.
                    </p>
                  </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usage Type</label>
                      <select
                        value={newPromoCode.usageType}
                        onChange={(e) => setNewPromoCode({...newPromoCode, usageType: e.target.value as any, usageLimit: ''})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      >
                        <option value="unlimited">Unlimited - Anyone can use multiple times</option>
                        <option value="once_per_client">Once Per Client - Each client can use once</option>
                        <option value="total_limit">Total Limit - Limited total uses</option>
                      </select>
                    </div>
                    {newPromoCode.usageType === 'total_limit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit</label>
                        <input
                          type="number"
                          min="1"
                          value={newPromoCode.usageLimit}
                          onChange={(e) => setNewPromoCode({...newPromoCode, usageLimit: e.target.value})}
                          placeholder="Enter limit"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                        />
                      </div>
                    )}
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
                      {newPromoCode.usageType === 'once_per_client' && ' Each client can only use this code once.'}
                      {newPromoCode.usageType === 'total_limit' && newPromoCode.usageLimit && ` Limited to ${newPromoCode.usageLimit} total uses.`}
                      {newPromoCode.usageType === 'unlimited' && ' Unlimited uses per client.'}
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
                  <h2 className="text-xl font-semibold mb-6">Regular Promocodes</h2>
                  {promoCodes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No regular promocodes created yet</div>
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
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">
                                    {promoCode.usageCount} used
                                    {promoCode.usageType === 'total_limit' && promoCode.usageLimit && ` / ${promoCode.usageLimit}`}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {promoCode.usageType === 'unlimited' && 'Unlimited'}
                                    {promoCode.usageType === 'once_per_client' && 'Once per client'}
                                    {promoCode.usageType === 'total_limit' && 'Total limit'}
                                    {promoCode.usageType === 'total_limit' && promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit && (
                                      <span className="ml-1 text-red-600 font-medium">(Max Reached)</span>
                                    )}
                                  </span>
                                </div>
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
              
              {/* Completed Tans Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly/Yearly Tans Chart */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Completed Spray Tans</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChartView('monthly')}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          chartView === 'monthly' 
                            ? 'bg-tan-600 text-white' 
                            : 'bg-tan-100 text-tan-700 hover:bg-tan-200'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setChartView('yearly')}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          chartView === 'yearly' 
                            ? 'bg-tan-600 text-white' 
                            : 'bg-tan-100 text-tan-700 hover:bg-tan-200'
                        }`}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-tan-200">
                    <div className="space-y-2">
                      {chartView === 'monthly' && stats.monthlyCompletedTans ? (
                        <>
                          <p className="text-sm text-gray-600 mb-4">
                            {new Date().getFullYear()} - Monthly Breakdown
                          </p>
                          {stats.monthlyCompletedTans.map((month) => {
                            const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month.month - 1]
                            const maxCount = Math.max(...stats.monthlyCompletedTans.map(m => m.count), 1)
                            const percentage = (month.count / maxCount) * 100
                            return (
                              <div key={month.month} className="flex items-center gap-3">
                                <span className="text-sm font-medium w-10">{monthName}</span>
                                <div className="flex-1 bg-tan-100 rounded-full h-6 relative">
                                  <div 
                                    className="bg-tan-600 h-full rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${Math.max(percentage, month.count > 0 ? 10 : 0)}%` }}
                                  >
                                    {month.count > 0 && (
                                      <span className="text-xs text-white font-medium">{month.count}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      ) : chartView === 'yearly' && stats.yearlyCompletedTans ? (
                        <>
                          <p className="text-sm text-gray-600 mb-4">All-Time Yearly Totals</p>
                          {stats.yearlyCompletedTans.map((year) => {
                            const maxCount = Math.max(...stats.yearlyCompletedTans.map(y => y.count), 1)
                            const percentage = (year.count / maxCount) * 100
                            return (
                              <div key={year.year} className="flex items-center gap-3">
                                <span className="text-sm font-medium w-12">{year.year}</span>
                                <div className="flex-1 bg-tan-100 rounded-full h-6 relative">
                                  <div 
                                    className="bg-tan-600 h-full rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${Math.max(percentage, year.count > 0 ? 10 : 0)}%` }}
                                  >
                                    {year.count > 0 && (
                                      <span className="text-xs text-white font-medium">{year.count}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Day of Week Popularity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Most Popular Days</h3>
                  <div className="bg-white p-4 rounded-lg border border-tan-200">
                    <p className="text-sm text-gray-600 mb-4">All-Time Statistics by Day of Week</p>
                    <div className="space-y-2">
                      {stats.dayOfWeekStats && stats.dayOfWeekStats.map((day) => {
                        const maxCount = Math.max(...stats.dayOfWeekStats.map(d => d.count), 1)
                        const percentage = (day.count / maxCount) * 100
                        return (
                          <div key={day.day} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-20">{day.day}</span>
                            <div className="flex-1 bg-blue-100 rounded-full h-6 relative">
                              <div 
                                className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${Math.max(percentage, day.count > 0 ? 10 : 0)}%` }}
                              >
                                {day.count > 0 && (
                                  <span className="text-xs text-white font-medium">{day.count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading referral data...</div>
            ) : (
              <>
                {/* Analytics Overview */}
                {referralAnalytics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card">
                      <div className="text-sm text-gray-600 mb-1">Total Referrals</div>
                      <div className="text-3xl font-bold text-tan-700">{referralAnalytics?.totalReferrals || 0}</div>
                      <div className="text-xs text-gray-500 mt-1">All-time referrals sent</div>
                    </div>
                    <div className="card">
                      <div className="text-sm text-gray-600 mb-1">Conversion Rate</div>
                      <div className="text-3xl font-bold text-green-600">{(referralAnalytics?.conversionRate || 0).toFixed(1)}%</div>
                      <div className="text-xs text-gray-500 mt-1">Referrals completed</div>
                    </div>
                    <div className="card">
                      <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                      <div className="text-3xl font-bold text-purple-600">${(referralAnalytics?.totalRevenueFromReferrals || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-1">From referred clients</div>
                    </div>
                    <div className="card">
                      <div className="text-sm text-gray-600 mb-1">Discounts Given</div>
                      <div className="text-3xl font-bold text-blue-600">${(referralAnalytics?.totalDiscountsGiven || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-1">Total rewards issued</div>
                    </div>
                  </div>
                )}

                {/* Top Referrers */}
                {referralAnalytics && referralAnalytics.topReferrers.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr className="text-left text-sm text-gray-600">
                            <th className="pb-2">Client</th>
                            <th className="pb-2">Referrals</th>
                            <th className="pb-2">Completed</th>
                            <th className="pb-2">Revenue Generated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referralAnalytics.topReferrers.map((referrer, index) => (
                            <tr key={index} className="border-b hover:bg-tan-50">
                              <td className="py-3">
                                <div>
                                  <div className="font-medium">{referrer.user?.name || 'Unknown User'}</div>
                                  <div className="text-sm text-gray-500">{referrer.user?.phone || 'No phone'}</div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="font-semibold">{referrer.referralCount}</span>
                              </td>
                              <td className="py-3">
                                <span className="text-green-600 font-medium">{referrer.completedCount}</span>
                              </td>
                              <td className="py-3">
                                <span className="text-purple-600 font-semibold">${referrer.revenue.toFixed(2)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Referral List with Filters */}
                <div className="card">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-lg font-semibold">All Referrals</h3>
                    <div className="flex gap-3 w-full md:w-auto">
                      <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={referralSearch}
                        onChange={(e) => setReferralSearch(e.target.value)}
                        className="flex-1 md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      />
                      <select
                        value={referralStatusFilter}
                        onChange={(e) => setReferralStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                      >
                        <option value="all">All Status</option>
                        <option value="sent">Sent</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="used_for_membership">Used for Membership</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm text-gray-600">
                          <th className="pb-2">Referrer</th>
                          <th className="pb-2">Friend</th>
                          <th className="pb-2">Code</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Sent Date</th>
                          <th className="pb-2">Reward</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals
                          .filter(r => {
                            if (referralStatusFilter !== 'all' && r.status !== referralStatusFilter) return false
                            if (referralSearch) {
                              const search = referralSearch.toLowerCase()
                              return (
                                r.referrerId.name.toLowerCase().includes(search) ||
                                r.referrerId.phone.includes(search) ||
                                r.friendName.toLowerCase().includes(search) ||
                                r.referredPhone.includes(search) ||
                                r.referralCode.toLowerCase().includes(search)
                              )
                            }
                            return true
                          })
                          .map((referral) => (
                            <tr key={referral._id} className="border-b hover:bg-tan-50">
                              <td className="py-3">
                                <div>
                                  <div className="font-medium">
                                    {typeof referral.referrerId === 'object' 
                                      ? referral.referrerId?.name || 'Unknown User'
                                      : 'User ID: ' + referral.referrerId}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {typeof referral.referrerId === 'object' 
                                      ? referral.referrerId?.phone || 'No phone'
                                      : ''}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <div>
                                  <div className="font-medium">{referral.friendName}</div>
                                  <div className="text-sm text-gray-500">{referral.referredPhone}</div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {referral.referralCode}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  referral.status === 'used_for_membership' ? 'bg-purple-100 text-purple-800' :
                                  referral.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  referral.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {referral.status.replace('_', ' ').charAt(0).toUpperCase() + referral.status.slice(1).replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                {referral.smsSentAt ? new Date(referral.smsSentAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="py-3">
                                {referral.referrerRewardAmount && referral.rewardApplied ? (
                                  <span className="text-green-600 font-medium">
                                    ${referral.referrerRewardAmount} {referral.referrerRewardType === 'membership_discount' ? '(Membership)' : '(Tan)'}
                                  </span>
                                ) : referral.status === 'completed' || referral.status === 'used_for_membership' ? (
                                  <span className="text-yellow-600">Pending</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {referrals.filter(r => {
                      if (referralStatusFilter !== 'all' && r.status !== referralStatusFilter) return false
                      if (referralSearch) {
                        const search = referralSearch.toLowerCase()
                        return (
                          r.referrerId.name.toLowerCase().includes(search) ||
                          r.referrerId.phone.includes(search) ||
                          r.friendName.toLowerCase().includes(search) ||
                          r.referredPhone.includes(search) ||
                          r.referralCode.toLowerCase().includes(search)
                        )
                      }
                      return true
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No referrals found matching your criteria
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Trends Chart */}
                {referralAnalytics && referralAnalytics.monthlyTrends && referralAnalytics.monthlyTrends.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
                    <div className="space-y-4">
                      {referralAnalytics.monthlyTrends.slice(-6).map((month) => {
                        const maxSent = Math.max(...referralAnalytics.monthlyTrends.map(m => m.sent), 1)
                        const sentPercentage = (month.sent / maxSent) * 100
                        const completedPercentage = month.sent > 0 ? (month.completed / month.sent) * 100 : 0
                        return (
                          <div key={month.month} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{month.month}</span>
                              <span className="text-gray-600">
                                {month.sent} sent, {month.completed} completed
                              </span>
                            </div>
                            <div className="bg-gray-100 rounded-full h-6 relative overflow-hidden">
                              <div 
                                className="bg-blue-200 h-full absolute left-0"
                                style={{ width: `${sentPercentage}%` }}
                              />
                              <div 
                                className="bg-blue-600 h-full absolute left-0"
                                style={{ width: `${(completedPercentage * sentPercentage) / 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              Revenue: ${month.revenue.toFixed(2)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Revenue Collection Modal */}
        {showRevenueModal && (() => {
          const booking = bookings.find(b => b._id === showRevenueModal)
          const isMemberBooking = booking?.membershipApplied
          const isAdditionalTan = booking?.membershipType === 'additional'
          const membershipCharge = booking?.membershipChargeAmount || 0
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
              <div className="bg-white rounded-t-2xl md:rounded-lg p-6 w-full md:max-w-md md:mx-4 animate-slide-up">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 md:hidden"></div>
                <h3 className="text-xl font-semibold mb-4">
                  {isMemberBooking ? 'Complete Member Appointment' : 'Complete Appointment'}
                </h3>
                
                <div className="mb-4">
                  <div className="bg-tan-50 rounded-lg p-3 mb-4">
                    <p className="font-medium text-tan-900">{booking.clientName}</p>
                    <p className="text-sm text-tan-700">{formatDate(booking.date)} at {formatTime(booking.time)}</p>
                  </div>
                </div>
                
                {isMemberBooking ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 font-medium">
                        {isAdditionalTan 
                          ? `✓ Additional tan - Base charge: $${membershipCharge}`
                          : `✓ Included tan - No base charge`
                        }
                      </p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tip Amount (optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tipInput}
                          onChange={(e) => setTipInput(e.target.value)}
                          className="w-full pl-8 pr-3 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                      {/* Quick Tip Buttons */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[5, 10, 15, 20].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setTipInput(amount.toString())}
                            className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>
                      {isAdditionalTan && tipInput && (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          Total revenue: ${(membershipCharge + (parseFloat(tipInput) || 0)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount Collected at Appointment
                        <span className="text-xs text-gray-500 font-normal ml-1">(excluding $10 deposit)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={revenueInput}
                          onChange={(e) => setRevenueInput(e.target.value)}
                          className="w-full pl-8 pr-3 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                      {/* Helper text */}
                      <p className="text-xs text-gray-500 mt-2">
                        Enter only what was collected today. The $10 deposit will be added automatically.
                      </p>
                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[55, 60, 65].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setRevenueInput(amount.toString())}
                            className="py-2.5 bg-tan-100 hover:bg-tan-200 rounded-lg font-medium transition-colors"
                          >
                            ${amount}{amount === 55 ? ' (standard)' : amount === 60 ? ' (+$5 tip)' : ' (+$10 tip)'}
                          </button>
                        ))}
                      </div>
                      {/* Revenue Calculator Display */}
                      {revenueInput && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">
                            Total Revenue: $10 deposit + ${parseFloat(revenueInput).toFixed(2)} today = 
                            <span className="text-blue-900 font-bold"> ${(10 + parseFloat(revenueInput)).toFixed(2)}</span>
                          </p>
                          {parseFloat(revenueInput) > 55 && (
                            <p className="text-xs text-blue-700 mt-1">
                              Includes ${(parseFloat(revenueInput) - 55).toFixed(2)} tip
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRevenueModal(null)
                      setRevenueInput('')
                      setTipInput('')
                    }}
                    className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevenueSubmit}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    ✓ Complete
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Manual Booking Modal */}
        {showManualBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl md:rounded-lg p-6 w-full md:max-w-md md:mx-4 animate-slide-up">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 md:hidden"></div>
              <h3 className="text-xl font-semibold mb-4">Quick Manual Booking</h3>
              
              <div className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualBookingDate}
                    onChange={(e) => setManualBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <div className="flex gap-2">
                    {/* Hour */}
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={manualBookingHour}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                          setManualBookingHour(val)
                        }
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 text-center"
                      placeholder="Hour"
                    />
                    
                    <span className="flex items-center text-gray-600 text-lg">:</span>
                    
                    {/* Minute */}
                    <select
                      value={manualBookingMinute}
                      onChange={(e) => setManualBookingMinute(e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                    
                    {/* AM/PM Toggle */}
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setManualBookingPeriod('AM')}
                        className={`px-4 py-2 font-medium transition-colors ${
                          manualBookingPeriod === 'AM' 
                            ? 'bg-tan-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualBookingPeriod('PM')}
                        className={`px-4 py-2 font-medium transition-colors border-l border-gray-300 ${
                          manualBookingPeriod === 'PM' 
                            ? 'bg-tan-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={manualBookingNotes}
                    onChange={(e) => setManualBookingNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                    placeholder="E.g., Spray tan party for 5 people, Walk-in client, etc."
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This booking will be marked as confirmed immediately. 
                    You can add revenue later when marking it as completed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualBookingModal(false)
                    setManualBookingDate('')
                    setManualBookingHour('')
                    setManualBookingMinute('00')
                    setManualBookingPeriod('AM')
                    setManualBookingNotes('')
                  }}
                  className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createManualBooking}
                  disabled={!manualBookingDate || !manualBookingHour}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    manualBookingDate && manualBookingHour
                      ? 'bg-tan-600 text-white hover:bg-tan-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Create Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
