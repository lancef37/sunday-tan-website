'use client'

import React, { useState, useEffect } from 'react'
import { FiSend, FiCalendar, FiCheck, FiStar, FiGift, FiDollarSign, FiRefreshCw } from 'react-icons/fi'
import axios from 'axios'

interface Referral {
  id: string
  friendName: string
  friendPhone: string
  code: string
  status: 'sent' | 'scheduled' | 'completed' | 'used_for_membership'
  smsSentAt: string
  scheduledAt?: string
  completedAt?: string
  rewardType?: string
  rewardAmount?: number
  rewardCode?: string
}

interface PendingDiscount {
  isMember: boolean
  pendingAmount: number
  referralCount: number
  maxDiscount: number
}

export default function ReferralTracker() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [pendingDiscount, setPendingDiscount] = useState<PendingDiscount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  
  useEffect(() => {
    fetchReferrals()
    fetchPendingDiscount()
    
    // Set up polling to refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchReferrals()
      fetchPendingDiscount()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/referrals/my-referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReferrals(response.data)
    } catch (error) {
      console.error('Error fetching referrals:', error)
    }
  }
  
  const fetchPendingDiscount = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/referrals/pending-discount`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPendingDiscount(response.data)
    } catch (error) {
      console.error('Error fetching pending discount:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return {
          icon: <FiSend className="w-4 h-4" />,
          text: 'Code Sent',
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        }
      case 'scheduled':
        return {
          icon: <FiCalendar className="w-4 h-4" />,
          text: 'Appointment Scheduled',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
      case 'completed':
        return {
          icon: <FiCheck className="w-4 h-4" />,
          text: 'Completed - Reward Earned!',
          color: 'bg-green-100 text-green-700 border-green-200'
        }
      case 'used_for_membership':
        return {
          icon: <FiStar className="w-4 h-4" />,
          text: 'Joined as Member!',
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        }
      default:
        return {
          icon: null,
          text: status,
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchReferrals(), fetchPendingDiscount()])
    setIsRefreshing(false)
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-tan-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-tan-100 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-tan-50 rounded"></div>
            <div className="h-20 bg-tan-50 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-tan-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-tan-50 to-white border-b border-tan-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-semibold text-tan-900 flex items-center gap-2">
            <FiGift className="w-6 h-6 text-tan-600" />
            Your Referrals
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-tan-600 hover:text-tan-700 hover:bg-tan-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh referrals"
          >
            <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {/* Pending discount summary for members */}
        {pendingDiscount?.isMember && pendingDiscount.pendingAmount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/80 rounded-lg">
                  <FiDollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    Pending Discount for Next Month
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    ${pendingDiscount.pendingAmount}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    From {pendingDiscount.referralCount} successful referral{pendingDiscount.referralCount !== 1 ? 's' : ''}
                    {pendingDiscount.pendingAmount >= 100 && ' (Maximum reached!)'}
                  </p>
                </div>
              </div>
              {pendingDiscount.pendingAmount < pendingDiscount.maxDiscount && (
                <div className="text-right">
                  <p className="text-xs text-purple-600">Max discount</p>
                  <p className="text-sm font-semibold text-purple-700">${pendingDiscount.maxDiscount}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Referral list */}
        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-tan-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FiGift className="w-8 h-8 text-tan-400" />
            </div>
            <h3 className="text-lg font-semibold text-tan-900 mb-2">No referrals yet</h3>
            <p className="text-tan-600">
              Start sharing the glow with friends and earn rewards!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral) => {
              const statusBadge = getStatusBadge(referral.status)
              const isCompleted = referral.status === 'completed' || referral.status === 'used_for_membership'
              
              return (
                <div
                  key={referral.id}
                  className="border border-tan-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-tan-900">{referral.friendName}</h4>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                          {statusBadge.icon}
                          {statusBadge.text}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-tan-600">
                        <span>{referral.friendPhone}</span>
                        <span className="text-tan-400">•</span>
                        <span>Code: {referral.code}</span>
                      </div>
                      
                      <div className="mt-2 text-xs text-tan-500">
                        Sent {formatDate(referral.smsSentAt)}
                        {referral.scheduledAt && (
                          <span> • Scheduled {formatDate(referral.scheduledAt)}</span>
                        )}
                        {referral.completedAt && (
                          <span> • Completed {formatDate(referral.completedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Reward chip for completed referrals */}
                    {isCompleted && (
                      <div className="flex-shrink-0">
                        {referral.rewardType === 'membership_discount' ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
                            <FiDollarSign className="w-4 h-4 text-purple-600" />
                            <div>
                              <p className="text-xs font-medium text-purple-700">$10 off subscription</p>
                            </div>
                          </div>
                        ) : referral.rewardCode ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                            <FiGift className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-xs font-medium text-green-700">$10 off</p>
                              <p className="text-[10px] text-green-600">Code: {referral.rewardCode}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}