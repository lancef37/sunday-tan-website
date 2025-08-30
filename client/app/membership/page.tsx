'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Users, DollarSign, Gift, Info } from 'lucide-react'
import MobileNav from '@/components/MobileNav'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface PromoCodeValidation {
  valid: boolean
  code?: string
  type?: 'regular' | 'referral'
  description?: string
  discountAmount?: number
  error?: string
}

interface AppliedPromoCode {
  code: string
  type: 'regular' | 'referral'
  description: string
  discountAmount: number
}

export default function MembershipPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [membershipStatus, setMembershipStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<AppliedPromoCode[]>([])
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [finalPrice, setFinalPrice] = useState(105)

  useEffect(() => {
    checkMembershipStatus()
  }, [])

  const checkMembershipStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setCheckingStatus(false)
        router.push('/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMembershipStatus(data)
        if (data.hasMembership) {
          router.push('/account')
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (err) {
    } finally {
      setCheckingStatus(false)
    }
  }

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoValidation(null)
      return
    }

    // Check if code is already applied
    if (appliedPromoCodes.some(pc => pc.code.toLowerCase() === code.trim().toLowerCase())) {
      setPromoValidation({
        valid: false,
        error: 'This promocode has already been applied'
      })
      return
    }

    setIsValidatingPromo(true)
    try {
      const isReferralCode = code.trim().toUpperCase().startsWith('REF-')
      
      const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
        code: code.trim(),
        amount: 105, // Monthly membership price
        isReferral: isReferralCode,
        appliedCodes: appliedPromoCodes.map(pc => pc.code)
      })
      
      setPromoValidation({
        valid: true,
        code: response.data.code,
        type: response.data.type || (isReferralCode ? 'referral' : 'regular'),
        description: response.data.description,
        discountAmount: response.data.discountAmount || 10 // Default $10 for membership
      })
      
    } catch (error: any) {
      setPromoValidation({
        valid: false,
        error: error.response?.data?.error || 'Invalid promocode'
      })
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const handlePromoCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPromoCodeInput(value)
  }

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoValidation({
        valid: false,
        error: 'Please enter a promocode'
      })
      return
    }

    setIsValidatingPromo(true)
    try {
      const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
        code: promoCodeInput.trim(),
        amount: 105,
        isReferral: promoCodeInput.trim().toUpperCase().startsWith('REF-')
      })
      
      // If valid, apply it immediately
      const newPromoCode: AppliedPromoCode = {
        code: response.data.code,
        type: response.data.type || 'regular',
        description: response.data.description || '',
        discountAmount: 10 // Fixed $10 off for membership
      }
      
      // LIMIT TO ONE PROMOCODE - Replace instead of adding
      const updatedPromoCodes = [newPromoCode]
      setAppliedPromoCodes(updatedPromoCodes)
      
      // Calculate new total - single code gives $10 off first month
      const newTotalDiscount = 10
      setTotalDiscount(newTotalDiscount)
      setFinalPrice(Math.max(0, 105 - newTotalDiscount))
      
      // Clear input
      setPromoCodeInput('')
      setPromoValidation(null)
      
    } catch (error: any) {
      setPromoValidation({
        valid: false,
        error: error.response?.data?.error || 'Invalid promocode'
      })
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const removePromoCode = (code: string) => {
    const updatedPromoCodes = appliedPromoCodes.filter(pc => pc.code !== code)
    setAppliedPromoCodes(updatedPromoCodes)
    
    // Reset to no discount when removing the single code
    const newTotalDiscount = 0
    setTotalDiscount(newTotalDiscount)
    setFinalPrice(105)
  }

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Include promocodes in the request
      const params = new URLSearchParams()
      if (appliedPromoCodes.length > 0) {
        params.append('appliedPromoCodes', JSON.stringify(appliedPromoCodes))
        params.append('totalDiscount', totalDiscount.toString())
      }
      
      const checkoutUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/membership/checkout-link?${params.toString()}`;
      
      const response = await fetch(checkoutUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subscription')
      }

      if (data.simulationMode) {
        // In simulation mode, create a simulated subscription
        
        const subscribeUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/membership/subscribe`;
        const subscribeBody = {
          // Backend expects 'promoCode' not 'appliedPromoCodes'
          promoCode: appliedPromoCodes.length > 0 ? appliedPromoCodes[0].code : undefined,
          // cardId is optional and not used in simulation
          cardId: null
        };
        
        
        const subscribeResponse = await fetch(subscribeUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(subscribeBody)
        })

        
        if (subscribeResponse.ok) {
          const subscribeData = await subscribeResponse.json();
          router.push('/account?membership=success')
        } else {
          const errorData = await subscribeResponse.json();
          throw new Error(errorData.message || 'Failed to create simulated subscription')
        }
      } else if (data.checkoutUrl) {
        // Redirect to Square checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start subscription process')
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking membership status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 to-tan-100">
      {/* Mobile Nav Component */}
      <MobileNav />
      
      <div className="py-12 px-4 sm:px-6 lg:px-8 pt-20 md:pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Join the Sunday Club!
            </h1>
            <p className="text-lg text-gray-600">
              Join our exclusive membership program and enjoy premium benefits
            </p>
          </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Membership Benefits</CardTitle>
            <CardDescription>Everything you need for the perfect glow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-tan-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">2 Free Tans Monthly</h3>
                  <p className="text-gray-600 text-sm">Includes two professional spray tans each month</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-6 w-6 text-tan-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Member Rate for Additional Tans</h3>
                  <p className="text-gray-600 text-sm">Only $40 for any additional tans (regular price $65)</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Gift className="h-6 w-6 text-tan-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">10% Off All Products</h3>
                  <p className="text-gray-600 text-sm">Save on our premium tanning products and accessories</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-tan-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Priority Booking</h3>
                  <p className="text-gray-600 text-sm">Get first access to appointments and special events</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promocode Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Have a Promocode?</CardTitle>
            <CardDescription>Apply a promocode for $10 off your first month</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Applied Promocodes */}
            {appliedPromoCodes.length > 0 && (
              <div className="mb-3 space-y-2">
                {appliedPromoCodes.map((promo) => (
                  <div key={promo.code} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">
                        {promo.code} ({promo.type === 'referral' ? 'Referral' : 'Promo'}) - $10 off
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePromoCode(promo.code)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Only show input if no promocode is applied (limit to one) */}
            {appliedPromoCodes.length === 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={handlePromoCodeChange}
                  placeholder="Enter promocode"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 focus:border-tan-500"
                />
                <Button
                  type="button"
                  onClick={handleApplyPromoCode}
                  disabled={isValidatingPromo || !promoCodeInput.trim()}
                  className="bg-tan-700 hover:bg-tan-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isValidatingPromo ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            )}
            
            {/* Only show error messages since valid codes are applied immediately */}
            {promoValidation && !promoValidation.valid && (
              <div className="mt-2">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-red-800">{promoValidation.error}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent>
            <div className="bg-gradient-to-r from-tan-700 to-tan-800 text-white p-8 rounded-lg">
              <div className="text-center">
                <div>
                  {appliedPromoCodes.length > 0 && (
                    <div className="text-xl mb-2 opacity-90">
                      <span className="line-through">$105</span>
                    </div>
                  )}
                  <div className="text-5xl font-bold mb-2">
                    ${finalPrice}
                  </div>
                </div>
                <div className="text-xl">
                  {appliedPromoCodes.length > 0 ? 'first month' : 'per month'}
                </div>
                {appliedPromoCodes.length > 0 && (
                  <div className="text-sm mt-2 opacity-90">
                    ${totalDiscount} discount applied • $105/month after
                  </div>
                )}
                <div className="mt-4 text-sm opacity-90">
                  Cancel anytime • No hidden fees • Instant benefits
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-1">All deposit fees waived</p>
                  <p>$40 due at time of booking per tan if you exceed your 2 included tans</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-center">
          <Button 
            onClick={handleSubscribe}
            disabled={loading}
            size="lg"
            className="bg-tan-700 hover:bg-tan-800 text-white px-8 py-3 text-lg transition-colors duration-200"
          >
            {loading ? 'Processing...' : 'Join the Sunday Club'}
          </Button>
          
          <p className="mt-4 text-sm text-gray-500">
            By subscribing, you agree to our membership terms and recurring billing
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}