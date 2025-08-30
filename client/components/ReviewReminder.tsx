'use client'

import React, { useState, useEffect } from 'react'
import { FiX, FiStar, FiGift } from 'react-icons/fi'

interface ReviewReminderProps {
  completedAppointments: number
  onReviewClick?: () => void
}

export default function ReviewReminder({ completedAppointments, onReviewClick }: ReviewReminderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the banner
    const isDismissed = localStorage.getItem('reviewReminderDismissed')
    const dismissedDate = localStorage.getItem('reviewReminderDismissedDate')
    
    // Reset dismissal after 30 days
    if (dismissedDate) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissal > 30) {
        localStorage.removeItem('reviewReminderDismissed')
        localStorage.removeItem('reviewReminderDismissedDate')
      }
    }
    
    // Show banner for users with 0-5 completed appointments who haven't dismissed it
    // This includes new users and those with few completed appointments
    if (completedAppointments >= 0 && completedAppointments <= 5 && !isDismissed) {
      // Delay showing to avoid layout shift
      setTimeout(() => {
        setIsVisible(true)
        setIsAnimating(true)
      }, 500)
    }
  }, [completedAppointments])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      localStorage.setItem('reviewReminderDismissed', 'true')
      localStorage.setItem('reviewReminderDismissedDate', Date.now().toString())
    }, 300)
  }

  const handleReviewClick = () => {
    if (onReviewClick) {
      onReviewClick()
    }
    handleDismiss()
  }

  if (!isVisible) return null

  return (
    <div 
      className={`mb-6 transition-all duration-300 ease-in-out ${
        isAnimating ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-tan-100 overflow-hidden">
        <div className="bg-gradient-to-r from-tan-700 to-tan-800 p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <FiGift className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                    Get $10 off your next tan!
                  </h3>
                  <p className="text-sm md:text-base text-white/90 mb-4">
                    Your feedback is valuable to small businesses like mine. Please consider leaving a review if you enjoyed your experience. Share it with me on your next visit and save $10! If you're already in the Sunday Club, receive $10 off a take-home solution instead!
                  </p>
                  
                  {/* Mobile-optimized CTA */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="https://g.page/r/CdzNmd9lzVuZEBM/review"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleReviewClick}
                      className="inline-flex items-center justify-center gap-2 bg-white text-tan-800 hover:bg-tan-50 font-semibold py-2 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                    >
                      <FiStar className="w-5 h-5" />
                      <span>Write a Review</span>
                    </a>
                    <button
                      onClick={handleDismiss}
                      className="inline-flex items-center justify-center text-white/80 hover:text-white text-sm font-medium py-2 px-4 transition-colors duration-200 sm:hidden"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
                
                {/* Dismiss button - hidden on mobile to reduce clutter */}
                <button
                  onClick={handleDismiss}
                  className="hidden sm:flex flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                  aria-label="Dismiss"
                >
                  <FiX className="w-5 h-5 text-white/80 hover:text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}