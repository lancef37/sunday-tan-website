'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { FiUser, FiMail, FiPhone, FiCalendar, FiLogOut, FiHome, FiStar, FiAward, FiGift } from 'react-icons/fi'
import AccountDashboard from '../../components/AccountDashboard'
import AppointmentCard from '../../components/AppointmentCard'
import ReferralModal from '../../components/ReferralModal'
import ReferralTracker from '../../components/ReferralTracker'
import ReviewReminder from '../../components/ReviewReminder'
import { Skeleton, SkeletonCard } from '../../components/ui/skeleton'
import MobileNav from '../../components/MobileNav'

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
  depositAmount?: number
  membershipApplied?: boolean
  membershipType?: 'included' | 'additional'
  createdAt: string
  refundStatus?: string
  refundAmount?: number
  cancelledAt?: string
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  smsOptIn?: boolean
}

interface MembershipStatus {
  hasMembership: boolean
  membership?: {
    id: string
    status: string
    startDate: string
    nextBillingDate: string
    tansUsedThisMonth: number
    tansIncluded: number
    tansRemaining: number
    pendingTans: number
    pendingIncludedTans: number
    pendingAdditionalTans: number
    monthlyPrice: number
    additionalTanPrice: number
  }
  usageHistory?: Array<{
    date: string
    type: string
    amount: number
    booking: {
      date: string
      time: string
      status: string
    }
  }>
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null)
  const [cancellingMembership, setCancellingMembership] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showCompletedAppointments, setShowCompletedAppointments] = useState(false)
  const [activeTab, setActiveTab] = useState<'account' | 'appointments' | 'rewards'>('account')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  // Combined refresh function for all data
  const refreshData = async (options = { user: true, bookings: true, membership: true }) => {
    const promises = []
    if (options.user) promises.push(fetchUserData())
    if (options.bookings) promises.push(fetchBookings())
    if (options.membership) promises.push(fetchMembershipStatus())
    await Promise.all(promises)
  }

  useEffect(() => {
    refreshData()
  }, [])

  // Refresh data when page becomes visible (user tabs back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if page has been hidden for more than 10 seconds
        const lastRefresh = sessionStorage.getItem('lastAccountRefresh')
        const now = Date.now()
        if (!lastRefresh || now - parseInt(lastRefresh) > 10000) {
          refreshData({ user: false, bookings: true, membership: true })
          sessionStorage.setItem('lastAccountRefresh', now.toString())
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
      
      // Log bookings to see refund status
      console.log('Fetched bookings:', response.data.map(b => ({
        id: b._id,
        status: b.status,
        refundStatus: b.refundStatus,
        refundAmount: b.refundAmount,
        membershipApplied: b.membershipApplied,
        isMemberBooking: b.isMemberBooking
      })))
      
      setBookings(response.data)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMembershipStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/membership/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMembershipStatus(response.data)
    } catch (error) {
      setMembershipStatus(null)
    }
  }

  const handleCancelMembership = async () => {
    if (!confirm('Are you sure you want to cancel your membership? You will lose access to member benefits at the end of your current billing cycle.')) {
      return
    }

    setCancellingMembership(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/api/membership/cancel`, 
        { reason: 'User requested cancellation' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await fetchMembershipStatus()
      alert('Your membership has been cancelled. You will retain access until the end of your billing period.')
    } catch (error) {
      alert('Failed to cancel membership. Please try again.')
    } finally {
      setCancellingMembership(false)
    }
  }

  const handleCancelBooking = async (booking: Booking) => {
    setSelectedBooking(booking)
    setShowCancelDialog(true)
  }

  const handleSmsOptInToggle = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      const newOptInStatus = !user.smsOptIn
      
      const response = await axios.put(
        `${API_URL}/api/auth/user/update-sms-preference`,
        { smsOptIn: newOptInStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setUser(response.data.user)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    } catch (error) {
      alert('Failed to update SMS preference. Please try again.')
    }
  }

  const confirmCancelBooking = async () => {
    if (!selectedBooking) return
    
    setCancellingBooking(selectedBooking._id)
    setShowCancelDialog(false)
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/bookings/cancel/${selectedBooking._id}`,
        { confirmCancel: true },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.success) {
        // Refresh both bookings and membership status after cancellation
        await Promise.all([
          fetchBookings(),
          fetchMembershipStatus()
        ])
        alert(response.data.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel booking')
    } finally {
      setCancellingBooking(null)
      setSelectedBooking(null)
    }
  }

  const getHoursUntilAppointment = (date: string, time: string) => {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const appointmentDate = new Date(year, month - 1, day, hour, minute)
    const now = new Date()
    const diffMs = appointmentDate.getTime() - now.getTime()
    return diffMs / (1000 * 60 * 60)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const formatDate = (date: string) => {
    // Parse date string as local date, not UTC
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
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

  const getPaymentStatusChip = (booking: Booking) => {
    // For cancelled bookings, check refund status
    if (booking.status === 'cancelled' && booking.paymentStatus === 'paid' && !booking.membershipApplied) {
      if (booking.refundStatus === 'processed') {
        return {
          label: 'Deposit Refunded',
          color: 'bg-green-100 text-green-800',
          tooltip: null
        }
      } else if (booking.refundStatus === 'not_applicable' || booking.refundStatus === 'none') {
        return {
          label: 'Deposit Not Refunded',
          color: 'bg-orange-100 text-orange-800',
          tooltip: 'Deposits are non-refundable for cancellations within 48 hours of appointment time'
        }
      }
    }

    // For active bookings
    if (booking.membershipApplied && booking.membershipType === 'additional') {
      return {
        label: 'Member Price Paid',
        color: 'bg-purple-100 text-purple-800',
        tooltip: null
      }
    }

    if (booking.paymentStatus === 'paid' && !booking.membershipApplied) {
      return {
        label: 'Deposit Paid',
        color: 'bg-green-100 text-green-800',
        tooltip: null
      }
    }

    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-50 to-white">
        <header className="bg-white shadow-sm border-b border-tan-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <Skeleton width="120px" height="32px" />
              <div className="flex items-center space-x-6">
                <Skeleton width="80px" height="20px" />
                <Skeleton width="80px" height="20px" />
                <Skeleton width="100px" height="40px" className="rounded-lg" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-6">
            <Skeleton width="100%" height="160px" className="rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="space-y-4">
              <Skeleton width="200px" height="32px" className="mb-4" />
              <Skeleton width="100%" height="120px" className="rounded-xl" />
              <Skeleton width="100%" height="120px" className="rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 via-white to-tan-50">
      <MobileNav />
      <header className="bg-white shadow-sm border-b border-tan-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="group flex items-center gap-2">
              <div className="p-2 bg-tan-100 rounded-lg group-hover:bg-tan-200 transition-colors">
                <FiHome className="w-5 h-5 text-tan-700" />
              </div>
              <span className="text-2xl font-serif font-semibold text-tan-900">
                Sunday Tan
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/book" className="flex items-center gap-2 text-tan-600 hover:text-tan-900 transition-colors">
                <FiCalendar className="w-4 h-4" />
                Book Appointment
              </Link>
              {!membershipStatus?.hasMembership && (
                <Link href="/membership" className="flex items-center gap-2 text-tan-600 hover:text-tan-800 font-medium transition-colors">
                  <FiStar className="w-4 h-4" />
                  Join the Sunday Club
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-tan-700 hover:bg-tan-800 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </nav>
            {/* Mobile menu button - Book appointment only */}
            <div className="md:hidden">
              <Link href="/book" className="p-2 bg-tan-100 rounded-lg inline-block">
                <FiCalendar className="w-5 h-5 text-tan-700" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Section */}
        <AccountDashboard 
          user={user!} 
          bookings={bookings} 
          membershipStatus={membershipStatus}
          onReferFriend={() => setShowReferralModal(true)}
        />

        {/* Tab Navigation */}
        <div className="mt-8 bg-white rounded-t-2xl shadow-md border border-b-0 border-tan-100">
          <div className="bg-gray-50/50 border-b-2 border-tan-200">
            <nav className="flex relative" aria-label="Tabs">
              <button
                onClick={() => {
                  setActiveTab('account')
                  // Refresh membership data when switching to account tab
                  if (activeTab !== 'account') {
                    fetchMembershipStatus()
                  }
                }}
                className={`group relative flex-1 sm:flex-initial sm:min-w-[180px] px-6 py-4 text-sm font-medium transition-all duration-200 transform
                  ${activeTab === 'account'
                    ? 'text-tan-900 bg-gradient-to-b from-white to-tan-50 shadow-md z-10 scale-[1.02]'
                    : 'text-tan-600 hover:text-tan-900 hover:bg-white/70 hover:shadow-sm hover:scale-[1.01] cursor-pointer active:scale-[0.99]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-inset`}
              >
                {activeTab === 'account' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-tan-700 rounded-t-full" />
                )}
                {activeTab !== 'account' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-tan-200 group-hover:bg-tan-400 transition-colors" />
                )}
                <div className="flex items-center justify-center gap-2">
                  <FiUser className={`w-4 h-4 transition-all duration-200 ${
                    activeTab === 'account' ? 'text-tan-700 scale-110' : 'group-hover:scale-110 group-hover:text-tan-700'
                  }`} />
                  <span className="font-semibold">Account Information</span>
                </div>
                {activeTab !== 'account' && <div className="absolute right-0 top-4 bottom-4 w-[1px] bg-tan-200" />}
              </button>
              <button
                onClick={() => {
                  setActiveTab('appointments')
                  // Refresh bookings when switching to appointments tab
                  if (activeTab !== 'appointments') {
                    fetchBookings()
                  }
                }}
                className={`group relative flex-1 sm:flex-initial sm:min-w-[180px] px-8 py-4 text-sm font-medium transition-all duration-200 transform
                  ${activeTab === 'appointments'
                    ? 'text-tan-900 bg-gradient-to-b from-white to-tan-50 shadow-md z-10 scale-[1.02]'
                    : 'text-tan-600 hover:text-tan-900 hover:bg-white/70 hover:shadow-sm hover:scale-[1.01] cursor-pointer active:scale-[0.99]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-inset`}
              >
                {activeTab === 'appointments' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-tan-700 rounded-t-full" />
                )}
                {activeTab !== 'appointments' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-tan-200 group-hover:bg-tan-400 transition-colors" />
                )}
                <div className="flex items-center justify-center gap-2">
                  <FiCalendar className={`w-4 h-4 transition-all duration-200 ${
                    activeTab === 'appointments' ? 'text-tan-700 scale-110' : 'group-hover:scale-110 group-hover:text-tan-700'
                  }`} />
                  <span className="font-semibold">Appointments</span>
                  {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length > 0 && (
                    <span className={`ml-1 px-2 py-0.5 text-xs rounded-full transition-all duration-200 ${
                      activeTab === 'appointments' 
                        ? 'bg-tan-700 text-white shadow-sm' 
                        : 'bg-tan-200 text-tan-700 group-hover:bg-tan-300 animate-pulse'
                    }`}>
                      {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length}
                    </span>
                  )}
                </div>
                {activeTab === 'account' && <div className="absolute left-0 top-4 bottom-4 w-[1px] bg-tan-200" />}
                {activeTab === 'rewards' && <div className="absolute left-0 top-4 bottom-4 w-[1px] bg-tan-200" />}
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`group relative flex-1 sm:flex-initial sm:min-w-[120px] px-4 py-4 text-sm font-medium transition-all duration-200 transform
                  ${activeTab === 'rewards'
                    ? 'text-tan-900 bg-gradient-to-b from-white to-tan-50 shadow-md z-10 scale-[1.02]'
                    : 'text-tan-600 hover:text-tan-900 hover:bg-white/70 hover:shadow-sm hover:scale-[1.01] cursor-pointer active:scale-[0.99]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-inset`}
              >
                {activeTab === 'rewards' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-tan-700 rounded-t-full" />
                )}
                {activeTab !== 'rewards' && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-tan-200 group-hover:bg-tan-400 transition-colors" />
                )}
                <div className="flex items-center justify-center gap-2">
                  <FiGift className={`w-4 h-4 transition-all duration-200 ${
                    activeTab === 'rewards' ? 'text-tan-700 scale-110' : 'group-hover:scale-110 group-hover:text-tan-700'
                  }`} />
                  <span className="font-semibold">Rewards</span>
                </div>
                {activeTab !== 'rewards' && <div className="absolute left-0 top-4 bottom-4 w-[1px] bg-tan-200" />}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-tan-100 overflow-hidden">
          {/* Account Information Tab */}
          {activeTab === 'account' && (
            <>
              <div className="p-6 bg-gradient-to-r from-tan-50 to-white border-b border-tan-100">
                <h2 className="text-xl font-serif font-semibold text-tan-900 flex items-center gap-2">
                  <FiUser className="w-6 h-6 text-tan-600" />
                  Account Information
                </h2>
              </div>
              
              {user && (
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-tan-50 rounded-lg">
                      <FiUser className="w-5 h-5 text-tan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-tan-600 mb-1">Full Name</p>
                      <p className="text-base font-medium text-tan-900">{user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-tan-50 rounded-lg">
                      <FiMail className="w-5 h-5 text-tan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-tan-600 mb-1">Email Address</p>
                      <p className="text-base font-medium text-tan-900">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-tan-50 rounded-lg">
                      <FiPhone className="w-5 h-5 text-tan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-tan-600 mb-1">Phone Number</p>
                      <p className="text-base font-medium text-tan-900">{user.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${user.smsOptIn ? 'bg-tan-600' : 'bg-tan-50'}`}>
                      {user.smsOptIn ? (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-2 h-2 text-tan-600" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-tan-600 mb-1">SMS Notifications</p>
                      <button
                        onClick={handleSmsOptInToggle}
                        className="text-sm font-medium text-tan-900 hover:text-tan-700 transition-colors"
                      >
                        {user.smsOptIn ? 'Enabled' : 'Disabled'}
                        <span className="text-xs text-tan-500 hover:text-tan-600 ml-2">(click to {user.smsOptIn ? 'disable' : 'enable'})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {membershipStatus?.hasMembership && (
                <div>
                  <div className="bg-gradient-to-r from-tan-700 to-tan-800 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">Sunday Club</h3>
                      </div>
                      <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                        {membershipStatus.membership?.status === 'active' ? 'Active' : membershipStatus.membership?.status}
                      </span>
                    </div>
                    
                    {/* Tan Usage Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-white/90">Monthly Tans</span>
                        <span className="text-sm font-semibold text-white">
                          {membershipStatus.membership?.tansUsedThisMonth + (membershipStatus.membership?.pendingIncludedTans || 0)} / {membershipStatus.membership?.tansIncluded}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-white/70 rounded-full transition-all duration-500"
                          style={{
                            width: `${((membershipStatus.membership?.tansUsedThisMonth || 0) + (membershipStatus.membership?.pendingIncludedTans || 0)) / (membershipStatus.membership?.tansIncluded || 1) * 100}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-white/80 mt-1">
                        {Math.max(0, (membershipStatus.membership?.tansIncluded || 0) - (membershipStatus.membership?.tansUsedThisMonth || 0) - (membershipStatus.membership?.pendingIncludedTans || 0))} tan{Math.max(0, (membershipStatus.membership?.tansIncluded || 0) - (membershipStatus.membership?.tansUsedThisMonth || 0) - (membershipStatus.membership?.pendingIncludedTans || 0)) !== 1 ? 's' : ''} remaining this month
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/10 p-3 rounded-lg">
                        <p className="text-white/80 mb-1">Next Billing</p>
                        <p className="font-semibold text-white">
                          {membershipStatus.membership?.nextBillingDate && 
                            new Date(membershipStatus.membership.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg">
                        <p className="text-white/80 mb-1">Extra Tan Price</p>
                        <p className="font-semibold text-white">${membershipStatus.membership?.additionalTanPrice}</p>
                      </div>
                    </div>
                    
                    {(() => {
                      const pendingIncluded = membershipStatus.membership?.pendingIncludedTans || 0
                      const pendingAdditional = membershipStatus.membership?.pendingAdditionalTans || 0
                      const totalPending = pendingIncluded + pendingAdditional
                      
                      if (totalPending > 0) {
                        return (
                          <div className="mt-3 p-3 bg-white/10 border border-white/20 rounded-lg">
                            <p className="text-sm text-white">
                              <span className="font-medium">{totalPending}</span> pending membership appointment{totalPending > 1 ? 's' : ''}
                              {pendingIncluded > 0 && pendingAdditional > 0 && (
                                <span className="text-xs text-white/80 block mt-1">
                                  ({pendingIncluded} included, {pendingAdditional} additional @ ${membershipStatus.membership?.additionalTanPrice})
                                </span>
                              )}
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}
                    
                    <div className="mt-4 pt-4 border-t border-tan-200">
                      <button
                        onClick={handleCancelMembership}
                        disabled={cancellingMembership}
                        className="text-sm text-red-300 hover:text-red-200 font-medium transition-colors"
                      >
                        {cancellingMembership ? 'Cancelling...' : 'Cancel Membership'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
                </div>
              )}
              
              {!membershipStatus?.hasMembership && (
                <div className="p-6 border-t border-tan-100">
                  <div className="bg-gradient-to-r from-tan-700 to-tan-800 p-6 rounded-xl text-white">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                        <FiStar className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">Join the Sunday Club</h3>
                        <p className="mb-4 text-white/90">Get 2 free tans monthly, discounted additional tans at $40, and exclusive member perks!</p>
                        <Link
                          href="/membership"
                          className="inline-flex items-center gap-2 bg-white text-tan-800 hover:bg-tan-50 font-semibold py-2 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                        >
                          <FiAward className="w-5 h-5" />
                          Become a Member
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <>
          <div className="p-6 bg-gradient-to-r from-tan-50 to-white border-b border-tan-100">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-semibold text-tan-900 flex items-center gap-2">
                <FiCalendar className="w-6 h-6 text-tan-600" />
                Appointments
              </h2>
              <Link
                href="/book"
                className="flex items-center gap-2 bg-tan-700 hover:bg-tan-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <FiCalendar className="w-4 h-4" />
                Book New
              </Link>
            </div>
          </div>

          <div className="p-6">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-tan-100 rounded-full mx-auto flex items-center justify-center mb-4">
                    <FiCalendar className="w-12 h-12 text-tan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-tan-900 mb-2">No appointments yet</h3>
                  <p className="text-tan-600">Ready to get your glow on? Book your first spray tan session!</p>
                </div>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 bg-tan-700 hover:bg-tan-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  <FiCalendar className="w-5 h-5" />
                  Book Your First Appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tab System */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setShowCompletedAppointments(false)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      !showCompletedAppointments 
                        ? 'text-tan-700 border-tan-700' 
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    Upcoming
                    {(() => {
                      const now = new Date()
                      const upcomingCount = bookings.filter(b => {
                        if (b.status === 'completed') return false
                        if (b.status === 'cancelled') {
                          const appointmentDate = new Date(`${b.date}T${b.time}`)
                          return appointmentDate >= now // Only count future cancelled appointments
                        }
                        return true // pending and confirmed
                      }).length
                      
                      return upcomingCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-tan-100 text-tan-700 text-xs rounded-full">
                          {upcomingCount}
                        </span>
                      )
                    })()}
                  </button>
                  <button
                    onClick={() => setShowCompletedAppointments(true)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      showCompletedAppointments 
                        ? 'text-tan-700 border-tan-700' 
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    History
                    {(() => {
                      const now = new Date()
                      const historyCount = bookings.filter(b => {
                        if (b.status === 'completed') return true
                        if (b.status === 'cancelled') {
                          const appointmentDate = new Date(`${b.date}T${b.time}`)
                          return appointmentDate < now // Past cancelled appointments
                        }
                        return false
                      }).length
                      
                      return historyCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {historyCount}
                        </span>
                      )
                    })()}
                  </button>
                </div>
                
                {/* Display appointments based on selected tab */}
                <div className="space-y-3">
                  {(() => {
                    const now = new Date()
                    
                    const filteredBookings = showCompletedAppointments
                      ? bookings.filter(b => {
                          // History tab: completed + past cancelled
                          if (b.status === 'completed') return true
                          if (b.status === 'cancelled') {
                            const appointmentDate = new Date(`${b.date}T${b.time}`)
                            return appointmentDate < now
                          }
                          return false
                        })
                      : bookings.filter(b => {
                          // Upcoming tab: pending, confirmed, and future cancelled only
                          if (b.status === 'completed') return false
                          if (b.status === 'cancelled') {
                            const appointmentDate = new Date(`${b.date}T${b.time}`)
                            return appointmentDate >= now // Only show if not past
                          }
                          return true // Show pending and confirmed
                        })
                    
                    const sortedBookings = filteredBookings.sort((a, b) => {
                      const dateA = new Date(`${a.date}T${a.time}`)
                      const dateB = new Date(`${b.date}T${b.time}`)
                      // Sort ascending (nearest first) for upcoming, descending (most recent first) for history
                      return showCompletedAppointments 
                        ? dateB.getTime() - dateA.getTime()
                        : dateA.getTime() - dateB.getTime()
                    })
                    
                    if (sortedBookings.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            {showCompletedAppointments 
                              ? "No appointment history yet" 
                              : "No upcoming appointments"}
                          </p>
                          {!showCompletedAppointments && (
                            <Link
                              href="/book"
                              className="inline-block mt-3 text-tan-700 hover:text-tan-800 font-medium text-sm"
                            >
                              Book an appointment →
                            </Link>
                          )}
                        </div>
                      )
                    }
                    
                    return sortedBookings.map((booking) => (
                      <AppointmentCard
                        key={booking._id}
                        booking={booking}
                        onCancel={handleCancelBooking}
                        isCancelling={cancellingBooking === booking._id}
                      />
                    ))
                  })()}
                </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <>
              <div className="p-6 bg-gradient-to-r from-tan-50 to-white border-b border-tan-100">
                <h2 className="text-xl font-serif font-semibold text-tan-900 flex items-center gap-2">
                  <FiGift className="w-6 h-6 text-tan-600" />
                  Rewards & Referrals
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Review Reminder Banner */}
                <ReviewReminder 
                  completedAppointments={bookings.filter(b => b.status === 'completed').length}
                />
                
                {/* Referral Tracker */}
                <ReferralTracker />
                
                {/* Refer Friend Button */}
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowReferralModal(true)}
                    className="inline-flex items-center gap-2 bg-tan-700 hover:bg-tan-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    <FiGift className="w-5 h-5" />
                    Refer a Friend
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Cancellation Dialog */}
      {showCancelDialog && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-tan-900 mb-4">
              Cancel Appointment?
            </h3>
            
            <div className="mb-4">
              <p className="text-tan-700 mb-2">
                Are you sure you want to cancel your appointment on {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.time)}?
              </p>
              
              {(() => {
                const hoursUntil = getHoursUntilAppointment(selectedBooking.date, selectedBooking.time)
                const willRefund = hoursUntil > 48 && selectedBooking.paymentStatus === 'paid' && !selectedBooking.membershipApplied
                
                if (selectedBooking.membershipApplied) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                      <p className="text-amber-800 text-sm">
                        <strong>Membership Appointment:</strong> This is {selectedBooking.membershipType === 'included' ? 'one of your included monthly tans' : 'an additional tan ($40)'}. 
                        Cancelling will free up this tan for rebooking within the same billing month.
                      </p>
                    </div>
                  )
                } else if (willRefund) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <p className="text-green-800 text-sm">
                        <strong>Refund Policy:</strong> Since you are cancelling more than 48 hours in advance, 
                        your ${selectedBooking.depositAmount || 10} deposit will be refunded. 
                        It may take 3-5 business days to appear in your account.
                      </p>
                    </div>
                  )
                } else if (hoursUntil > 0 && selectedBooking.paymentStatus === 'paid') {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-red-800 text-sm">
                        <strong>Refund Policy:</strong> Cancellations within 48 hours of the appointment are non-refundable. 
                        Your ${selectedBooking.depositAmount || 10} deposit will not be refunded.
                      </p>
                    </div>
                  )
                } else if (selectedBooking.promoCode?.code) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-blue-800 text-sm">
                        <strong>Promocode Booking:</strong> No deposit was charged for this appointment.
                      </p>
                    </div>
                  )
                }
              })()}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false)
                  setSelectedBooking(null)
                }}
                className="px-4 py-2 border border-tan-300 text-tan-700 rounded-lg hover:bg-tan-50 transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={confirmCancelBooking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Referral Modal */}
      <ReferralModal 
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        onSuccess={() => {
          // Optionally refresh referrals or show a success message
        }}
      />
    </div>
  )
}