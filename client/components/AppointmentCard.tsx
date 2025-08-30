'use client'

import React, { useState } from 'react'
import { FiCalendar, FiClock, FiMapPin, FiDollarSign, FiTag, FiCheckCircle, FiXCircle, FiAlertCircle, FiClock as FiPending } from 'react-icons/fi'

interface AppointmentCardProps {
  booking: any
  onCancel: (booking: any) => void
  isCancelling: boolean
}

export default function AppointmentCard({ booking, onCancel, isCancelling }: AppointmentCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return {
      full: d.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      short: d.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' })
    }
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  const getHoursUntilAppointment = (date: string, time: string) => {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const appointmentDate = new Date(year, month - 1, day, hour, minute)
    const now = new Date()
    const diffMs = appointmentDate.getTime() - now.getTime()
    return diffMs / (1000 * 60 * 60)
  }

  const getDaysUntilAppointment = (date: string, time: string) => {
    const hours = getHoursUntilAppointment(date, time)
    return Math.floor(hours / 24)
  }

  const getCountdownText = (date: string, time: string) => {
    const daysUntil = getDaysUntilAppointment(date, time)
    const hoursUntil = getHoursUntilAppointment(date, time)
    
    if (hoursUntil < 0) return null
    if (daysUntil === 0) return 'Today'
    if (daysUntil === 1) return 'Tomorrow'
    if (daysUntil <= 7) return `In ${daysUntil} days`
    if (daysUntil <= 14) return 'Next week'
    if (daysUntil <= 30) return `In ${Math.floor(daysUntil / 7)} weeks`
    return null
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          borderColor: 'border-l-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: <FiCheckCircle className="w-4 h-4 text-green-600" />,
          label: 'Confirmed'
        }
      case 'pending':
        return {
          borderColor: 'border-l-yellow-500',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          icon: <FiPending className="w-4 h-4 text-yellow-600" />,
          label: 'Pending'
        }
      case 'completed':
        return {
          borderColor: 'border-l-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          icon: <FiCheckCircle className="w-4 h-4 text-blue-600" />,
          label: 'Completed'
        }
      case 'cancelled':
        return {
          borderColor: 'border-l-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          icon: <FiXCircle className="w-4 h-4 text-red-600" />,
          label: 'Cancelled'
        }
      default:
        return {
          borderColor: 'border-l-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          icon: null,
          label: status
        }
    }
  }

  const getPaymentInfo = () => {
    // Handle member bookings first
    if (booking.membershipApplied || booking.isMemberBooking) {
      // For cancelled member bookings, show refund status if applicable
      if (booking.status === 'cancelled') {
        if (booking.refundStatus === 'processed') {
          return { label: 'Refunded ($40)', color: 'bg-green-100 text-green-700', icon: <FiDollarSign className="w-3 h-3" /> }
        }
        // For cancelled member bookings, just show the type without "Non-refundable"
        // The refund logic is handled by the reordering system
        if (booking.membershipType === 'included') {
          return { label: 'Member Tan (Included)', color: 'bg-gray-100 text-gray-600', icon: <FiCheckCircle className="w-3 h-3" /> }
        }
        return { label: 'Member Tan ($40)', color: 'bg-gray-100 text-gray-600', icon: <FiDollarSign className="w-3 h-3" /> }
      }
      // Active member bookings
      if (booking.membershipType === 'included') {
        return { label: 'Member Tan (Included)', color: 'bg-purple-100 text-purple-700', icon: <FiCheckCircle className="w-3 h-3" /> }
      }
      return { label: 'Member Tan ($40)', color: 'bg-purple-100 text-purple-700', icon: <FiDollarSign className="w-3 h-3" /> }
    }
    
    // Non-member bookings
    if (booking.status === 'cancelled' && booking.paymentStatus === 'paid') {
      if (booking.refundStatus === 'processed') {
        return { label: 'Refunded', color: 'bg-green-100 text-green-700', icon: <FiDollarSign className="w-3 h-3" /> }
      } else if (booking.refundStatus === 'not_applicable' || booking.refundStatus === 'none') {
        return { label: 'Non-refundable', color: 'bg-orange-100 text-orange-700', icon: <FiAlertCircle className="w-3 h-3" /> }
      }
    }
    
    if (booking.paymentStatus === 'paid') {
      return { label: 'Deposit Paid', color: 'bg-green-100 text-green-700', icon: <FiDollarSign className="w-3 h-3" /> }
    }
    
    if (booking.promoCode?.code) {
      return { label: booking.promoCode.code, color: 'bg-blue-100 text-blue-700', icon: <FiTag className="w-3 h-3" /> }
    }
    
    return null
  }

  const hoursUntil = getHoursUntilAppointment(booking.date, booking.time)
  const canCancel = ['pending', 'confirmed'].includes(booking.status) && hoursUntil > 0
  const statusConfig = getStatusConfig(booking.status)
  const paymentInfo = getPaymentInfo()
  const dateInfo = formatDate(booking.date)
  const countdownText = getCountdownText(booking.date, booking.time)
  
  // Determine if this is an upcoming appointment
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status) && hoursUntil > 0

  return (
    <div className={`relative bg-white rounded-lg shadow-sm border border-gray-200 ${statusConfig.borderColor} border-l-4 overflow-hidden hover:shadow-md transition-shadow duration-200`}>
      <div className="p-4">
        {/* Header Row - Date and Status */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            {/* Date and Countdown */}
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-semibold text-gray-900">
                {dateInfo.weekday}, {dateInfo.short}
              </h3>
              {countdownText && isUpcoming && (
                <span className="text-xs font-medium text-tan-600 bg-tan-50 px-2 py-0.5 rounded">
                  {countdownText}
                </span>
              )}
            </div>
            
            {/* Time - More prominent */}
            <div className="flex items-center gap-1.5 text-gray-700">
              <FiClock className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-medium">{formatTime(booking.time)}</span>
            </div>
          </div>

          {/* Status Icon and Label - Compact */}
          <div className="flex items-center gap-1.5">
            {statusConfig.icon}
            <span className={`text-xs font-medium ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Service and Duration - Single Line */}
        <div className="text-sm text-gray-600 mb-2">
          Spray Tan • 30 minutes
        </div>

        {/* Payment/Promo Chip and Location - Compact */}
        <div className="flex flex-col gap-2">
          {paymentInfo && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                {paymentInfo.icon}
                {paymentInfo.label}
              </span>
              {booking.refundStatus === 'not_applicable' && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTooltip(!showTooltip)
                  }}
                >
                  <FiAlertCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          
          {/* Location - Shortened for mobile */}
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=12425+Big+Valley+Creek,+San+Antonio,+TX+78254"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-tan-700 transition-colors"
          >
            <FiMapPin className="w-3 h-3" />
            <span className="truncate underline">Sunday Tan Studio</span>
          </a>
        </div>

        {/* Tooltip */}
        {showTooltip && booking.refundStatus === 'not_applicable' && !booking.membershipApplied && !booking.isMemberBooking && (
          <div className="absolute left-4 bottom-16 z-10 w-56 p-2.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
            <div className="relative">
              Cancellations within 48 hours are non-refundable.
              <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-800 transform rotate-45"></div>
            </div>
          </div>
        )}

        {/* Cancel Button - Subtle */}
        {canCancel && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => onCancel(booking)}
              disabled={isCancelling}
              className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}