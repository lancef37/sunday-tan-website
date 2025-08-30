'use client'

import React, { useState } from 'react'
import { FiX, FiSend, FiCheck, FiAlertCircle } from 'react-icons/fi'
import axios from 'axios'

interface ReferralModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ReferralModal({ isOpen, onClose, onSuccess }: ReferralModalProps) {
  const [friendName, setFriendName] = useState('')
  const [friendPhone, setFriendPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phone = value.replace(/\D/g, '')
    
    // Format as (xxx) xxx-xxxx
    if (phone.length <= 3) {
      return phone
    } else if (phone.length <= 6) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3)}`
    } else {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`
    }
  }
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFriendPhone(formatted)
    setError('')
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!friendName.trim() || !friendPhone.trim()) {
      setError('Please enter both name and phone number')
      return
    }
    
    // Validate phone length
    const digitsOnly = friendPhone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/referrals/send`,
        {
          friendName: friendName.trim(),
          friendPhone: digitsOnly
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      if (response.data.success) {
        setSuccess(true)
        setReferralCode(response.data.referralCode)
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setFriendName('')
          setFriendPhone('')
          setSuccess(false)
          setReferralCode('')
          onSuccess?.()
          onClose()
        }, 3000)
      }
    } catch (err: any) {
      console.error('Referral error:', err)
      setError(err.response?.data?.error || 'Failed to send referral. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-tan-600 to-tan-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-semibold">Refer a Friend</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-tan-100">
            Share the glow! Your friend gets $10 off, and you earn rewards too.
          </p>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-tan-900 mb-2">
                Referral Sent!
              </h3>
              <p className="text-tan-600 mb-4">
                {friendName} will receive their code via text message.
              </p>
              <div className="bg-tan-50 rounded-lg p-4">
                <p className="text-sm text-tan-600 mb-2">Referral Code:</p>
                <p className="text-2xl font-bold text-tan-900">{referralCode}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tan-700 mb-2">
                  Friend's Name
                </label>
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="Enter friend's name"
                  className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tan-700 mb-2">
                  Friend's Phone Number
                </label>
                <input
                  type="tel"
                  value={friendPhone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500"
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div className="bg-tan-50 rounded-lg p-4">
                <p className="text-sm text-tan-700">
                  <strong>Your friend will receive:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-tan-600">
                  <li>• $10 off their first spray tan</li>
                  <li>• OR $10 off first month of membership</li>
                </ul>
                <p className="mt-3 text-sm text-tan-700">
                  <strong>You'll get:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-tan-600">
                  <li>• Members: $10 off next month (stackable up to $100)</li>
                  <li>• Non-members: $10 off your next tan</li>
                </ul>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-tan-700 hover:bg-tan-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    Send Referral
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}