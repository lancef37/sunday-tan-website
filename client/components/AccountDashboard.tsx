'use client'

import React from 'react'
import { FiCalendar, FiDollarSign, FiStar, FiTrendingUp, FiUser, FiAward } from 'react-icons/fi'
import { StatsCard } from './ui/stats-card'

interface DashboardProps {
  user: {
    name?: string | null
    email: string
    phone: string
  }
  bookings: any[]
  membershipStatus: any
  onReferFriend: () => void
  onViewAppointments?: () => void
}

export default function AccountDashboard({ user, bookings, membershipStatus, onReferFriend, onViewAppointments }: DashboardProps) {
  // Calculate statistics
  const totalAppointments = bookings.filter(b => b.status === 'completed').length
  const upcomingAppointments = bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length
  const memberSince = membershipStatus?.membership?.startDate 
    ? new Date(membershipStatus.membership.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null
    
  // Calculate member savings
  const calculateSavings = () => {
    if (!membershipStatus?.hasMembership) return 0
    const includedTanValue = (membershipStatus.membership?.tansUsedThisMonth || 0) * 60 // Each included tan worth $60
    const additionalTanDiscount = bookings.filter(b => 
      b.membershipApplied && b.membershipType === 'additional' && b.status === 'completed'
    ).length * 20 // $20 discount per additional tan
    return includedTanValue + additionalTanDiscount
  }
  
  const totalSavings = calculateSavings()
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-tan-600 to-tan-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-semibold mb-2">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-tan-100 text-lg">
              {upcomingAppointments > 0 
                ? `You have ${upcomingAppointments} upcoming appointment${upcomingAppointments > 1 ? 's' : ''}`
                : 'Ready to book your next glow?'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${membershipStatus?.hasMembership ? 'lg:grid-cols-3' : ''} gap-4`}>
        <StatsCard
          title="Upcoming"
          value={upcomingAppointments}
          icon={<FiTrendingUp className="w-6 h-6 text-tan-600" />}
          description={`Scheduled appointment${upcomingAppointments !== 1 ? 's' : ''}`}
          onClick={onViewAppointments}
        />
        
        <StatsCard
          title="Total Appointments"
          value={totalAppointments}
          icon={<FiCalendar className="w-6 h-6 text-tan-600" />}
          description={`Completed session${totalAppointments !== 1 ? 's' : ''}`}
          onClick={onViewAppointments}
        />
        
        {membershipStatus?.hasMembership && (
          <StatsCard
            title="Member Since"
            value={memberSince || 'New'}
            icon={<FiAward className="w-6 h-6 text-tan-600" />}
            description="Loyalty status"
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <a href="/book" className="flex-1 min-w-[150px] bg-tan-700 hover:bg-tan-800 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
          <FiCalendar className="w-5 h-5" />
          Book Next Tan
        </a>
        <button 
          onClick={onReferFriend}
          className="flex-1 min-w-[150px] bg-white hover:bg-tan-50 text-tan-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 border border-tan-300 flex items-center justify-center gap-2"
        >
          <FiUser className="w-5 h-5" />
          Refer a Friend
        </button>
        <a 
          href="https://g.page/r/CdzNmd9lzVuZEBM/review" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 min-w-[150px] bg-white hover:bg-tan-50 text-tan-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 border border-tan-300 flex items-center justify-center gap-2"
        >
          <FiStar className="w-5 h-5" />
          Leave a Review
        </a>
      </div>
    </div>
  )
}