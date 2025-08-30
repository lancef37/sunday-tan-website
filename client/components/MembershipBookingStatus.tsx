'use client'

import React from 'react'
import { CheckCircle, Star, Info } from 'lucide-react'

interface MembershipPricing {
  hasMembership: boolean
  tansUsedThisMonth: number
  pendingTans: number
  totalTansToBeUsed: number
  tansIncluded: number
  tansRemaining: number
  tanPrice: number
  membershipType: 'included' | 'additional'
  depositRequired: boolean
  paymentRequired: boolean
}

interface MembershipBookingStatusProps {
  membershipPricing: MembershipPricing | null
  loading?: boolean
}

export default function MembershipBookingStatus({ membershipPricing, loading }: MembershipBookingStatusProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-green-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-green-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!membershipPricing || !membershipPricing.hasMembership) {
    return null
  }

  const isIncluded = membershipPricing.membershipType === 'included'
  const completedAndPending = membershipPricing.tansUsedThisMonth + membershipPricing.pendingTans

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">Member Benefits Active</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          
          <div className="text-sm text-gray-700 space-y-1">
            <div className="flex items-center justify-between">
              <span>Monthly Tans Used:</span>
              <span className="font-medium">
                {membershipPricing.tansUsedThisMonth} completed
                {membershipPricing.pendingTans > 0 && (
                  <span className="text-gray-500"> + {membershipPricing.pendingTans} pending</span>
                )}
                {' '}of {membershipPricing.tansIncluded}
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-green-200">
              <span className="font-medium">This appointment:</span>
              {isIncluded ? (
                <span className="text-green-600 font-bold">FREE (Included)</span>
              ) : (
                <span className="text-amber-600 font-bold">${membershipPricing.tanPrice} (Member Rate)</span>
              )}
            </div>
          </div>
          
          {/* Info message based on status */}
          <div className="mt-3 text-xs text-gray-600 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              {isIncluded 
                ? "No deposit or payment required - this tan is included with your membership!"
                : `Additional tan at member rate. Regular price $65, you pay only $${membershipPricing.tanPrice}.`
              }
            </span>
          </div>
          
          {/* Warning if this is their last included tan */}
          {completedAndPending === membershipPricing.tansIncluded - 1 && isIncluded && (
            <div className="mt-2 text-xs text-amber-600 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Note: This is your last included tan for the month. Additional tans will be $40 each.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}