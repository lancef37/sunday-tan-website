'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Info, Star } from 'lucide-react'
import Link from 'next/link'

interface MembershipPricingProps {
  isAuthenticated: boolean
  onPriceCalculated?: (price: number, isMemberPrice: boolean) => void
}

interface MembershipStatus {
  hasMembership: boolean
  membership?: {
    tansUsedThisMonth: number
    tansIncluded: number
    tansRemaining: number
    pendingTans: number
    additionalTanPrice: number
    status: string
  }
}

export default function MembershipPricing({ isAuthenticated, onPriceCalculated }: MembershipPricingProps) {
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembershipStatus()
    }
  }, [isAuthenticated])

  const fetchMembershipStatus = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership/status`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('MembershipPricing - Membership status:', data)
        setMembershipStatus(data)
        
        // Calculate price for this booking
        if (data.hasMembership && onPriceCalculated) {
          const price = data.membership.tansUsedThisMonth < data.membership.tansIncluded 
            ? 0 
            : data.membership.additionalTanPrice
          onPriceCalculated(price, true)
        }
      }
    } catch (error) {
      console.error('Error fetching membership status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!membershipStatus?.hasMembership) {
    return (
      <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Save with Membership
          </CardTitle>
          <CardDescription>Join our membership program for exclusive benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">2 free tans every month (normally $65 each)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">Additional tans at only $40</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">10% off all products</span>
            </li>
          </ul>
          <Link 
            href="/membership"
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Learn More About Membership
          </Link>
        </CardContent>
      </Card>
    )
  }

  const { membership } = membershipStatus
  const isIncludedTan = membership!.tansUsedThisMonth < membership!.tansIncluded
  const price = isIncludedTan ? 0 : membership!.additionalTanPrice

  return (
    <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Active Membership
        </CardTitle>
        <CardDescription>Your member benefits are active</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
            <span className="text-sm font-medium">Monthly Tans Used</span>
            <span className="text-sm font-bold">
              {membership!.tansUsedThisMonth} of {membership!.tansIncluded}
            </span>
          </div>
          
          {membership!.pendingTans > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                You have {membership!.pendingTans} pending appointment{membership!.pendingTans > 1 ? 's' : ''} that will count toward your monthly allowance when completed.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="p-4 bg-white rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Price for this appointment:</p>
              <p className="text-3xl font-bold text-green-600">
                ${price}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isIncludedTan ? 'Included with membership' : 'Member additional tan rate'}
              </p>
            </div>
          </div>
          
          {!isIncludedTan && (
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                You've used your {membership!.tansIncluded} included tans this month. This appointment will be charged at the member rate of ${membership!.additionalTanPrice}.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-xs text-gray-500 italic">
            Note: Tans are counted when your appointment is completed by our staff.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}