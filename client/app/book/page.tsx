'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import SquarePaymentForm from '../../components/SquarePaymentForm'
import ProtectedRoute from '../../components/ProtectedRoute'
import MembershipBookingStatus from '../../components/MembershipBookingStatus'

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingData {
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  smsConsent: boolean;
  promoCode?: string;
}

interface PromoCodeValidation {
  valid: boolean;
  code?: string;
  type?: 'regular' | 'referral';
  description?: string;
  discountAmount?: number;
  finalAmount?: number;
  error?: string;
}

interface AppliedPromoCode {
  code: string;
  type: 'regular' | 'referral';
  description: string;
  discountAmount: number;
}

export default function BookingPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Value>(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [bookingData, setBookingData] = useState<BookingData>({
    date: '',
    time: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    smsConsent: true, // Default to true, will be based on user preference
    promoCode: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'calendar' | 'policy' | 'details' | 'payment' | 'confirmation'>('calendar')
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<AppliedPromoCode[]>([])
  const [depositAmount, setDepositAmount] = useState(10)
  const [finalDepositAmount, setFinalDepositAmount] = useState(10)
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [additionalDiscount, setAdditionalDiscount] = useState(0)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [reservationSessionId, setReservationSessionId] = useState<string>('')
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [membershipPricing, setMembershipPricing] = useState<any>(null)
  const [loadingMembership, setLoadingMembership] = useState(false)
  const [showWaiver, setShowWaiver] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    // Timer for reservation countdown
    if (reservationExpiry) {
      const timer = setInterval(() => {
        const now = new Date()
        const remaining = Math.max(0, reservationExpiry.getTime() - now.getTime())
        setTimeRemaining(Math.floor(remaining / 1000))
        
        if (remaining <= 0) {
          alert('Your reservation has expired. Please select a new time slot.')
          resetBookingFlow()
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [reservationExpiry])

  useEffect(() => {
    // Check authentication and load user data
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?returnUrl=/book')
        return
      }
      
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setBookingData(prev => ({
          ...prev,
          clientName: parsedUser.name,
          clientPhone: parsedUser.phone,
          clientEmail: parsedUser.email
        }))
      }
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedDate && selectedDate instanceof Date) {
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate])

  // Fetch membership status when entering details step
  useEffect(() => {
    const fetchMembershipStatus = async () => {
      if (step === 'details' && user) {
        setLoadingMembership(true)
        try {
          const token = localStorage.getItem('token')
          if (token) {
            const response = await axios.get(
              `${API_URL}/api/membership/status`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (response.data.hasMembership) {
              // Calculate membership pricing for display
              const membership = response.data.membership
              const totalTansToBeUsed = membership.tansUsedThisMonth + membership.pendingTans
              
              let tanPrice = 0
              let membershipType = 'included'
              let depositRequired = false
              let paymentRequired = false
              
              if (totalTansToBeUsed < membership.tansIncluded) {
                // This will be an included tan
                tanPrice = 0
                membershipType = 'included'
                depositRequired = false
                paymentRequired = false
              } else {
                // This will be an additional tan
                tanPrice = 40 // Member rate for additional tans
                membershipType = 'additional'
                depositRequired = false
                paymentRequired = true
              }
              
              setMembershipPricing({
                hasMembership: true,
                tansUsedThisMonth: membership.tansUsedThisMonth,
                pendingTans: membership.pendingTans,
                totalTansToBeUsed: totalTansToBeUsed + 1,
                tansIncluded: membership.tansIncluded,
                tansRemaining: Math.max(0, membership.tansIncluded - totalTansToBeUsed - 1),
                tanPrice,
                membershipType,
                depositRequired,
                paymentRequired
              })
            }
          }
        } catch (error) {
        } finally {
          setLoadingMembership(false)
        }
      }
    }
    
    fetchMembershipStatus()
  }, [step, user])

  // Helper function to format date in local timezone (YYYY-MM-DD)
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const fetchAvailableSlots = async (date: Date) => {
    try {
      const dateStr = formatDateForAPI(date)
      const response = await axios.get(`${API_URL}/api/slots/${dateStr}`)
      setAvailableSlots(response.data)
    } catch (error) {
      setAvailableSlots(generateDefaultSlots())
    }
  }

  const formatTimeDisplay = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }
  
  const formatDateDisplay = (dateString: string): string => {
    // Parse date string as local date, not UTC
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const generateDefaultSlots = (): TimeSlot[] => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      slots.push({
        time: `${hour}:00`,
        available: true
      })
      if (hour < 17) {
        slots.push({
          time: `${hour}:30`,
          available: true
        })
      }
    }
    return slots
  }

  const handleDateChange = (value: Value) => {
    setSelectedDate(value)
    setSelectedTime('')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (selectedDate instanceof Date) {
      setBookingData({
        ...bookingData,
        date: formatDateForAPI(selectedDate),
        time: time
      })
      setStep('policy')
    }
  }

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoValidation(null)
      setFinalDepositAmount(depositAmount)
      return
    }

    setIsValidatingPromo(true)
    try {
      const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
        code: code.trim(),
        amount: depositAmount,
        clientPhone: bookingData.clientPhone
      })
      
      setPromoValidation({
        valid: true,
        code: response.data.code,
        description: response.data.description,
        discountAmount: response.data.discountAmount,
        finalAmount: response.data.finalAmount
      })
      
      setFinalDepositAmount(response.data.finalAmount)
      
    } catch (error: any) {
      setPromoValidation({
        valid: false,
        error: error.response?.data?.error || 'Invalid promocode'
      })
      setFinalDepositAmount(depositAmount)
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const handlePromoCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPromoCodeInput(value)
    // Don't auto-validate anymore - wait for Enter key
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
        amount: depositAmount
      })
      
      // If valid, apply it immediately
      const newPromoCode: AppliedPromoCode = {
        code: response.data.code,
        type: response.data.type || 'regular',
        description: response.data.description || '',
        discountAmount: response.data.discountAmount || 0
      }
      
      // LIMIT TO ONE PROMOCODE - Replace instead of adding
      const updatedPromoCodes = [newPromoCode]
      setAppliedPromoCodes(updatedPromoCodes)
      
      // Calculate new totals
      const newTotalDiscount = updatedPromoCodes.reduce((sum, pc) => sum + pc.discountAmount, 0)
      setTotalDiscount(newTotalDiscount)
      
      // Update deposit amount based on logic
      calculateFinalDepositAmount(updatedPromoCodes)
      
      // Clear input and validation message
      setPromoCodeInput('')
      setPromoValidation(null)
      setFinalDepositAmount(response.data.finalAmount || depositAmount - newTotalDiscount)
      
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
    
    const newTotalDiscount = updatedPromoCodes.reduce((sum, pc) => sum + pc.discountAmount, 0)
    setTotalDiscount(newTotalDiscount)
    
    calculateFinalDepositAmount(updatedPromoCodes)
  }

  const calculateFinalDepositAmount = (promoCodes: AppliedPromoCode[]) => {
    const hasRegularPromo = promoCodes.some(pc => pc.type === 'regular')
    const hasReferralPromo = promoCodes.some(pc => pc.type === 'referral')
    
    if (hasRegularPromo || hasReferralPromo) {
      // Deposit is waived
      setFinalDepositAmount(0)
      
      if (hasRegularPromo && hasReferralPromo) {
        // Both codes applied - track additional $10 discount for appointment time
        setAdditionalDiscount(10)
      } else {
        setAdditionalDiscount(0)
      }
    } else {
      setFinalDepositAmount(depositAmount)
      setAdditionalDiscount(0)
    }
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get auth token
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login?returnUrl=/book')
      return
    }
    
    // Determine actual payment amount based on membership
    let actualPaymentAmount = finalDepositAmount
    let paymentType = 'deposit'
    
    if (membershipPricing?.hasMembership) {
      if (membershipPricing.paymentRequired) {
        // Member needs to pay for additional tan
        actualPaymentAmount = membershipPricing.tanPrice
        paymentType = 'additional_tan'
      } else {
        // Member gets free tan
        actualPaymentAmount = 0
        paymentType = 'included_tan'
      }
    }
    
    // Prepare reservation data
    const reservationData = {
      date: bookingData.date,
      time: bookingData.time,
      smsConsent: bookingData.smsConsent,
      promoCode: appliedPromoCodes.length > 0 ? appliedPromoCodes[0].code : undefined, // Legacy field
      appliedPromoCodes: appliedPromoCodes, // New field for multiple codes
      totalPromoDiscount: totalDiscount,
      additionalDiscount: additionalDiscount,
      finalAmount: actualPaymentAmount,
      depositAmount: membershipPricing?.hasMembership ? 0 : finalDepositAmount
    }
    
    // Create temporary reservation
    setIsLoading(true)
    try {
      const response = await axios.post(
        `${API_URL}/api/reservations/reserve`, 
        reservationData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setReservationSessionId(response.data.sessionId)
      setReservationExpiry(new Date(response.data.expiresAt))
      setMembershipPricing(response.data.membershipPricing)
      
      // Skip payment if no payment required (member included tan or waived by promo)
      if (actualPaymentAmount <= 0) {
        // Complete booking without payment
        try {
          const completeResponse = await axios.post(
            `${API_URL}/api/reservations/complete`,
            {
              sessionId: response.data.sessionId,
              paymentStatus: 'waived'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          
          setCreatedBooking(completeResponse.data)
          
          // Apply the promocode to increment usage count
          if (promoValidation?.valid && promoValidation.code) {
            try {
              await axios.post(`${API_URL}/api/promocodes/apply`, {
                code: promoValidation.code,
                clientPhone: bookingData.clientPhone,
                bookingId: completeResponse.data._id,
                discountAmount: promoValidation.discountAmount
              })
            } catch (error) {
            }
          }
          
          setPaymentResult({
            success: true,
            message: membershipPricing?.hasMembership 
              ? 'Free appointment - included with membership!' 
              : 'Deposit waived by promocode',
            amount: 0
          })
          setStep('confirmation')
        } catch (completeError) {
          alert('Failed to complete booking. Please try again.')
        }
      } else {
        setStep('payment')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      alert(`There was an error reserving your time slot: ${errorMessage}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (paymentData: any) => {
    setIsLoading(true)
    const token = localStorage.getItem('token')
    
    try {
      // Determine payment amount and type
      const paymentAmount = membershipPricing?.hasMembership && membershipPricing.paymentRequired 
        ? membershipPricing.tanPrice 
        : finalDepositAmount
      
      // First process the payment
      const paymentResponse = await axios.post(`${API_URL}/api/payments/process-deposit`, {
        sourceId: paymentData.sourceId,
        amount: paymentAmount,
        promoCode: promoValidation?.valid ? promoValidation.code : undefined,
        paymentType: membershipPricing?.hasMembership && membershipPricing.paymentRequired 
          ? 'additional_tan' 
          : 'deposit'
      })
      
      // Then complete the booking with the reservation
      const completeResponse = await axios.post(
        `${API_URL}/api/reservations/complete`,
        {
          sessionId: reservationSessionId,
          paymentId: paymentResponse.data.paymentId,
          paymentStatus: 'paid'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setCreatedBooking(completeResponse.data)
      setPaymentResult(paymentResponse.data)
      setStep('confirmation')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Payment or booking failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentError = (error: string) => {
    alert(`Payment failed: ${error}`)
  }

  const resetBookingFlow = () => {
    // Cancel any existing reservation
    if (reservationSessionId) {
      const token = localStorage.getItem('token')
      if (token) {
        axios.post(
          `${API_URL}/api/reservations/cancel`,
          { sessionId: reservationSessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(err => {})
      }
    }
    
    setStep('calendar')
    setBookingData({
      date: '',
      time: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      smsConsent: true,
      promoCode: ''
    })
    setSelectedTime('')
    setPromoCodeInput('')
    setPromoValidation(null)
    setFinalDepositAmount(depositAmount)
    setCreatedBooking(null)
    setPaymentResult(null)
    setReservationSessionId('')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 relative">
        {/* Exit button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-0 right-4 sm:right-6 lg:right-8 p-2 rounded-full bg-white/80 hover:bg-white text-tan-600 hover:text-tan-800 shadow-md hover:shadow-lg transition-all duration-300 group"
          title="Exit booking"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="sr-only">Exit booking flow</span>
        </button>
        
        <div className="text-center mb-6 sm:mb-8 pt-6 sm:pt-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-light text-tan-900 mb-2 sm:mb-4">Book Your Session</h1>
          <p className="text-sm sm:text-base text-tan-600 mb-4 sm:mb-8">Schedule your professional spray tan experience</p>
          <div className="flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${step === 'calendar' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              1. Date & Time
            </div>
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${step === 'policy' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              2. Policy
            </div>
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${step === 'details' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              3. Details
            </div>
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${step === 'payment' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              4. {finalDepositAmount <= 0 ? 'Review' : 'Payment'}
            </div>
            <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${step === 'confirmation' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              5. Confirmation
            </div>
          </div>
        </div>

        {step === 'calendar' && (
          <div className="card max-w-4xl mx-auto p-4 sm:p-6 bg-gradient-to-b from-white to-tan-50">
            <h2 className="text-xl sm:text-2xl font-serif font-light text-tan-900 mb-4 sm:mb-6 text-center">Select Your Appointment</h2>
            
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-6">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full max-w-sm lg:max-w-none bg-white rounded-xl border border-tan-200 shadow-sm p-3 sm:p-4">
                  <div className="mb-3 pb-2 border-b border-tan-100">
                    <p className="text-sm font-medium text-tan-700 text-center">Choose a Date</p>
                  </div>
                  <Calendar
                    onChange={handleDateChange}
                    value={selectedDate}
                    minDate={new Date()}
                    className="w-full mobile-calendar border-0"
                  />
                  <div className="mt-3 pt-3 border-t border-tan-100">
                    <p className="text-xs sm:text-sm text-tan-600 text-center px-2 flex items-center justify-center gap-1">
                      <svg className="w-4 h-4 text-tan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Mobile tans for parties of 5+</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedDate && (
                <div className="flex-1">
                  <div className="bg-white rounded-xl border border-tan-200 shadow-sm p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-serif font-light text-tan-900 mb-4 text-center lg:text-left">
                      Available Appointments
                    </h3>
                    
                    {availableSlots.filter(slot => slot.available).length > 0 ? (
                      <div className="space-y-4">
                        {/* Morning slots */}
                        {availableSlots.filter(slot => {
                          const hour = parseInt(slot.time.split(':')[0])
                          return slot.available && hour < 12
                        }).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-tan-600 uppercase tracking-wider mb-2 px-1">Morning</p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableSlots
                                .filter(slot => {
                                  const hour = parseInt(slot.time.split(':')[0])
                                  return slot.available && hour < 12
                                })
                                .map((slot) => (
                                <button
                                  key={slot.time}
                                  onClick={() => handleTimeSelect(slot.time)}
                                  className="group relative bg-gradient-to-b from-white to-tan-50 border border-tan-200 rounded-lg p-3 sm:p-4 
                                    hover:from-tan-50 hover:to-tan-100 hover:border-tan-400 hover:shadow-md hover:scale-[1.02]
                                    transition-all duration-200 cursor-pointer overflow-hidden
                                    focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-offset-1 min-h-[52px]"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-tan-600 to-tan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                  <span className="relative font-medium text-tan-800 group-hover:text-white transition-colors duration-200 text-sm sm:text-base">
                                    {formatTimeDisplay(slot.time)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Afternoon slots */}
                        {availableSlots.filter(slot => {
                          const hour = parseInt(slot.time.split(':')[0])
                          return slot.available && hour >= 12 && hour < 17
                        }).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-tan-600 uppercase tracking-wider mb-2 px-1">Afternoon</p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableSlots
                                .filter(slot => {
                                  const hour = parseInt(slot.time.split(':')[0])
                                  return slot.available && hour >= 12 && hour < 17
                                })
                                .map((slot) => (
                                <button
                                  key={slot.time}
                                  onClick={() => handleTimeSelect(slot.time)}
                                  className="group relative bg-gradient-to-b from-white to-tan-50 border border-tan-200 rounded-lg p-3 sm:p-4 
                                    hover:from-tan-50 hover:to-tan-100 hover:border-tan-400 hover:shadow-md hover:scale-[1.02]
                                    transition-all duration-200 cursor-pointer overflow-hidden
                                    focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-offset-1 min-h-[52px]"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-tan-600 to-tan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                  <span className="relative font-medium text-tan-800 group-hover:text-white transition-colors duration-200 text-sm sm:text-base">
                                    {formatTimeDisplay(slot.time)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Evening slots */}
                        {availableSlots.filter(slot => {
                          const hour = parseInt(slot.time.split(':')[0])
                          return slot.available && hour >= 17
                        }).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-tan-600 uppercase tracking-wider mb-2 px-1">Evening</p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableSlots
                                .filter(slot => {
                                  const hour = parseInt(slot.time.split(':')[0])
                                  return slot.available && hour >= 17
                                })
                                .map((slot) => (
                                <button
                                  key={slot.time}
                                  onClick={() => handleTimeSelect(slot.time)}
                                  className="group relative bg-gradient-to-b from-white to-tan-50 border border-tan-200 rounded-lg p-3 sm:p-4 
                                    hover:from-tan-50 hover:to-tan-100 hover:border-tan-400 hover:shadow-md hover:scale-[1.02]
                                    transition-all duration-200 cursor-pointer overflow-hidden
                                    focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-offset-1 min-h-[52px]"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-tan-600 to-tan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                  <span className="relative font-medium text-tan-800 group-hover:text-white transition-colors duration-200 text-sm sm:text-base">
                                    {formatTimeDisplay(slot.time)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-tan-600">
                        <svg className="w-12 h-12 mx-auto mb-3 text-tan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium">No available times</p>
                        <p className="text-sm mt-2 text-tan-500">Please select a different date</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'policy' && (
          <div className="card max-w-2xl mx-auto p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center">
              {showWaiver ? 'Spray Tanning Release Form' : 'Booking Policy'}
            </h2>
            
            {!showWaiver && (
              <>
                <div className="bg-tan-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 border border-tan-200">
                  <p className="text-tan-700 font-medium">
                    Selected: {formatDateDisplay(bookingData.date)} at {formatTimeDisplay(bookingData.time)}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">Spray tans are $65 unless you are a member of the Sunday Club (sign up in your Account page!)</p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">$10 deposit due at booking (unless you are a member of the Sunday Club or have a promocode) and the remaining $55 will be due at the time of your appointment.</p>
                  </div>
                  
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">Appointments will appear in your My Account page</p>
                  </div>                  

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">If you cancel your appointment more than 48 hours in advance, you will be refunded your deposit</p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">If you cancel within 48 hours of your appointment, your deposit will not be refunded</p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">
                      My tanning studio is at{' '}
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=12425+Big+Valley+Creek,+San+Antonio,+TX"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tan-600 hover:text-tan-800 underline font-medium"
                      >
                        12425 Big Valley Creek
                      </a>
                      {' '}in Alamo Ranch
                    </p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">
                      Text me with any questions at{' '}
                      <a 
                        href="tel:907-947-2882"
                        className="text-tan-600 hover:text-tan-800 underline font-medium"
                      >
                        907-947-2882
                      </a>
                    </p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">
                      If you are 10 minutes late or more for your spray tan, there will be a $10 late fee, and there's no guarantee I can still fit you into my schedule. Text me in advance if you think you are running late.
                    </p>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-tan-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700">
                      By selecting Accept & Continue, you have read and agree to the Sunday Tan waiver form
                    </p>
                  </div>
                </div>

                <div className="bg-tan-50 p-4 rounded-lg border border-tan-200 mb-6">
                  <p className="text-tan-700 text-center mb-3">
                    Want to review the waiver before proceeding?
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowWaiver(true)}
                    className="w-full px-4 py-3 bg-white hover:bg-tan-50 text-tan-700 border-2 border-tan-400 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    View Waiver Form
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep('calendar')}
                    className="btn-secondary w-full sm:flex-1 py-3 text-sm sm:text-base"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-tan-700 hover:bg-tan-800 text-white rounded-lg font-medium text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Accept & Continue
                  </button>
                </div>
              </>
            )}

            {showWaiver && (
              <div className="animate-fadeIn">
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 text-gray-700">
                  <p className="font-medium">Please read the following:</p>

                  <p>
                    Spray tanning is accomplished by application of a solution containing the active ingredient: DHA (Dihydroxyacetone). 
                    DHA is generally considered to be safe and has been FDA approved ONLY if you follow guide lines to protect mucous membranes. 
                    The FDA advises asking the following questions when considering the application of DHA products by spraying or misting:
                  </p>

                  <ul className="list-disc pl-6 space-y-2">
                    <li>Are you protected from exposure in the entire area of the eyes, in addition to the eyes themselves? (googles or stickers can be requested if needed)</li>
                    <li>Are you protected from exposure on the lips and all parts of the body covered by mucous membrane? (lip balm or spa garments are available if requested)</li>
                    <li>Are you protected from internal exposure caused by inhaling or ingesting the product? (ventilation used as needed, and nose filters are available upon request)</li>
                  </ul>

                  <p>
                    If the answer to any of these questions is "no," you are not protected from the unapproved use of DHA. 
                    You should request measures to protect your eyes and mucous membranes and prevent inhalation.
                  </p>

                  <div className="bg-tan-50 p-4 rounded-lg border border-tan-200">
                    <h3 className="text-lg font-semibold text-tan-900 mb-3">What to expect:</h3>
                    <p className="mb-3">
                      You will enter a private room where you will remove your clothing. This is up to you and your level of comfort. 
                      You should wear a snug dark swimsuit or underwear. Spa undergarments may be available upon requested. 
                      The solution will wash out of most clothing. It is always best to wear dark loose fitting cotton clothing. 
                      It is advised to wash the undergarment or clothing worn as soon as possible after your session.
                    </p>
                    <p className="mb-3">
                      Next, you will be sprayed. This process will take approximately ten to fifteen minutes. 
                      After spraying, your skin should be dry before putting your clothes back on and you should not bathe or sweat excessively for eight hours. 
                      (Dusting powder may be available upon request)
                    </p>
                    <p>
                      The solution will give you an immediate bronzing effect. The bronzing effect is a result of a temporary coloring additive in the solution 
                      that will remain on the skin until your tan develops. When you shower, the coloring will come off to reveal your sunless DHA tan beneath.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p>
                      All people, all skin, is different. All ingredients used in this procedure are intended for cosmetic use and generally regarded as safe. 
                      There are, however, occasions where individuals may be allergic to one or more ingredients in the spray tan solution. 
                      Please ask for the ingredients list if you have any known allergies. Please discuss with your technician.
                    </p>

                    <p>
                      Be advised there is a small percentage of people whose skin may not react favorably to spray tanning. 
                      For this reason, we do NOT advise being sprayed for the first time when your appearance is critical; 
                      (wedding/special occasion/prom) Please schedule a practice session 30 days before your event, for best results.
                    </p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="font-semibold text-amber-900 mb-2">Common Sense Caution:</p>
                    <p>
                      Pregnant or nursing women should consult their physician, and obtain a written release before using. 
                      Spray tanning is not normally contraindicated, when a mask or nose filters are used. 
                      But each pregnancy is different, your medical care provider may prefer a more cautious approach based on your specific needs and health concerns.
                    </p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="font-semibold text-red-900 mb-2">Warning:</p>
                    <p>
                      This product does not contain a sunscreen and does not protect against sunburn. 
                      Repeated exposure of unprotected skin to U.V. Light may increase the risk of skin aging, skin cancer and other harmful effects to the skin even if you do not burn.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Acknowledgment:</h3>
                    <p className="mb-3">
                      I have been provided with spray tan care instructions, which I have read and understand completely. 
                      To my knowledge, I have no medical condition or allergy which would preclude me from having this procedure done. 
                      I have been honest and accurate about the information that I have provided on this waiver.
                    </p>
                    <p className="mb-3">
                      I take sole responsibility of any reaction I may have, staining of clothing and/or personal belongings.
                    </p>
                    <p className="font-medium">
                      I have read and completely understand this consent form. (please advise your technician if you have any questions)
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-tan-200">
                  <button
                    type="button"
                    onClick={() => setShowWaiver(false)}
                    className="w-full px-6 py-3 bg-tan-700 hover:bg-tan-800 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Policy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="card max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-b from-white to-tan-50">
            <h2 className="text-2xl font-serif font-light text-tan-900 mb-6 text-center">Booking Information</h2>
            <div className="bg-gradient-to-r from-tan-100 to-tan-50 p-4 rounded-xl mb-6 border border-tan-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-tan-600 mb-1">Your Selected Appointment</p>
                  <p className="text-lg font-medium text-tan-900">
                    {formatDateDisplay(bookingData.date)}
                  </p>
                  <p className="text-tan-700 font-medium">
                    {formatTimeDisplay(bookingData.time)}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <svg className="w-12 h-12 text-tan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Membership Status Display */}
            <MembershipBookingStatus 
              membershipPricing={membershipPricing} 
              loading={loadingMembership}
            />
            
            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              {/* User info display - read only */}
              <div className="bg-white p-5 rounded-xl border border-tan-200 shadow-sm">
                <h3 className="text-lg font-serif text-tan-900 mb-4 pb-2 border-b border-tan-100">Your Account Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-tan-600 font-medium">Name</span>
                    <span className="text-tan-900">{bookingData.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-tan-600 font-medium">Phone</span>
                    <span className="text-tan-900">{bookingData.clientPhone}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-tan-600 font-medium">Email</span>
                    <span className="text-tan-900 text-sm sm:text-base">{bookingData.clientEmail}</span>
                  </div>
                </div>
              </div>
              
              {/* Promocode Section */}
              <div className="bg-white p-5 rounded-xl border border-tan-200 shadow-sm">
                <h3 className="text-lg font-serif text-tan-900 mb-4 pb-2 border-b border-tan-100">Promotional Codes</h3>
                
                {/* Applied Promocodes */}
                {appliedPromoCodes.length > 0 && (
                  <div className="mb-4">
                    {appliedPromoCodes.map((promo) => (
                      <div key={promo.code} className="flex items-center justify-between p-3 bg-gradient-to-r from-tan-50 to-tan-100 border border-tan-300 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-tan-600 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-tan-900">{promo.code}</p>
                            <p className="text-xs text-tan-600">
                              {promo.type === 'referral' ? 'Referral Code' : 'Promotional Code'} - ${promo.discountAmount} off
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePromoCode(promo.code)}
                          className="p-1.5 hover:bg-tan-200 rounded-lg transition-colors"
                          title="Remove code"
                        >
                          <svg className="w-4 h-4 text-tan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Only show input if no promocode is applied (limit to one) */}
                {appliedPromoCodes.length === 0 && (
                  <>
                    <p className="text-sm text-tan-600 mb-3">Have a promotional code? Enter it below to apply your discount.</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={handlePromoCodeChange}
                        placeholder="Enter code"
                        maxLength={15}
                        className="w-full sm:w-48 px-4 py-3 border-2 border-tan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-400 focus:border-tan-400 transition-all duration-300 bg-white placeholder-tan-400 uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        disabled={isValidatingPromo || !promoCodeInput.trim()}
                        className="w-full sm:w-auto px-8 py-3 bg-tan-700 text-white rounded-lg hover:bg-tan-800 disabled:bg-tan-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                      >
                        {isValidatingPromo ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                        ) : (
                          'Apply Code'
                        )}
                      </button>
                    </div>
                  </>
                )}
                
                {/* Only show error messages since valid codes are applied immediately */}
                {promoValidation && !promoValidation.valid && (
                  <div className="mt-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">{promoValidation.error}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deposit Information - Only show for non-members */}
              {!membershipPricing?.hasMembership && (
                <div className="relative bg-gradient-to-r from-tan-50 to-tan-100 p-5 rounded-xl border border-tan-300 shadow-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-tan-200 rounded-full -mr-12 -mt-12 opacity-30"></div>
                  <div className="relative">
                    <h3 className="text-lg font-serif text-tan-900 mb-3">Deposit Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-tan-700">Standard Deposit</span>
                        <span className={appliedPromoCodes.length > 0 ? "text-tan-600 line-through" : "text-tan-900 font-semibold"}>
                          ${depositAmount.toFixed(2)}
                        </span>
                      </div>
                      {appliedPromoCodes.length > 0 && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-tan-700">Discount Applied</span>
                          <span className="text-green-600 font-semibold">-${depositAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pt-2 mt-2 border-t border-tan-300">
                        <div className="flex justify-between items-center">
                          <span className="text-tan-900 font-semibold">Amount Due</span>
                          <span className="text-xl font-bold text-tan-900">${finalDepositAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-tan-600 mt-3">
                      {finalDepositAmount === 0 
                        ? "Deposit waived with your promotional code. Proceed to confirm your appointment." 
                        : "Refundable deposit required to secure your appointment time."}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Member Payment Information - Only show if payment required */}
              {membershipPricing?.hasMembership && membershipPricing.paymentRequired && (
                <div className="relative bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-300 shadow-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200 rounded-full -mr-12 -mt-12 opacity-30"></div>
                  <div className="relative">
                    <h3 className="text-lg font-serif text-amber-900 mb-3">Additional Tan Payment</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-amber-700">Regular Price</span>
                        <span className="text-amber-600 line-through">$65.00</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-amber-700">Member Discount</span>
                        <span className="text-green-600 font-semibold">-$25.00</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-amber-300">
                        <div className="flex justify-between items-center">
                          <span className="text-amber-900 font-semibold">Member Rate</span>
                          <span className="text-xl font-bold text-amber-900">${membershipPricing.tanPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-amber-700 mt-3">
                      Additional tan beyond your monthly allowance at exclusive member pricing.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('policy')}
                  className="w-full sm:flex-1 px-6 py-3 bg-white hover:bg-tan-50 text-tan-700 border-2 border-tan-300 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Back to Policy
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 bg-tan-700 hover:bg-tan-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {finalDepositAmount <= 0 && (!membershipPricing?.hasMembership || !membershipPricing.paymentRequired)
                    ? 'Complete Booking'
                    : 'Continue to Payment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'payment' && reservationSessionId && (
          <div className="card max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-b from-white to-tan-50">
            <h2 className="text-2xl font-serif font-light text-tan-900 mb-6 text-center">Secure Payment</h2>
            
            {/* Reservation Timer */}
            {timeRemaining > 0 && (
              <div className={`relative p-4 rounded-xl mb-6 overflow-hidden transition-all duration-300 ${
                timeRemaining < 60 
                  ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-300' 
                  : 'bg-gradient-to-r from-tan-50 to-tan-100 border border-tan-300'
              }`}>
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 opacity-20 ${
                  timeRemaining < 60 ? 'bg-red-300' : 'bg-tan-300'
                }`}></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      timeRemaining < 60 ? 'text-red-800' : 'text-tan-700'
                    }`}>
                      Reservation Time Remaining
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      timeRemaining < 60 ? 'text-red-900' : 'text-tan-900'
                    }`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <svg className={`w-10 h-10 ${timeRemaining < 60 ? 'text-red-400' : 'text-tan-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}
            
            <div className="bg-white p-5 rounded-xl mb-6 border border-tan-200 shadow-sm">
              <h3 className="text-lg font-serif text-tan-900 mb-4 pb-2 border-b border-tan-100">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Appointment Date</span>
                  <span className="text-tan-900">{formatDateDisplay(bookingData.date)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Appointment Time</span>
                  <span className="text-tan-900">{formatTimeDisplay(bookingData.time)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Client Name</span>
                  <span className="text-tan-900">{bookingData.clientName}</span>
                </div>
                {appliedPromoCodes.length > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-tan-600 font-medium">Promotional Code</span>
                    <span className="text-green-600 font-semibold">{appliedPromoCodes[0].code}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-tan-200">
                <div className="space-y-2">
                  {membershipPricing?.hasMembership && membershipPricing.paymentRequired ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-600">Regular Price</span>
                        <span className="text-tan-500 line-through">$65.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-600">Member Discount</span>
                        <span className="text-green-600 font-semibold">-$25.00</span>
                      </div>
                    </>
                  ) : appliedPromoCodes.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-600">Standard Deposit</span>
                        <span className="text-tan-500 line-through">${depositAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-600">Promo Discount</span>
                        <span className="text-green-600 font-semibold">-${appliedPromoCodes[0].discountAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-tan-600">Deposit Amount</span>
                      <span className="text-tan-900 font-semibold">${finalDepositAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="pt-3 mt-3 border-t border-tan-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-tan-900">
                        {membershipPricing?.hasMembership && membershipPricing.paymentRequired 
                          ? 'Total Due' 
                          : 'Deposit Due'}
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-tan-900">
                          ${(membershipPricing?.hasMembership && membershipPricing.paymentRequired 
                            ? membershipPricing.tanPrice 
                            : finalDepositAmount).toFixed(2)}
                        </span>
                        {membershipPricing?.hasMembership && membershipPricing.paymentRequired && (
                          <p className="text-xs text-tan-600 mt-1">Member rate applied</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form Section */}
            <div className="bg-white p-5 rounded-xl border border-tan-200 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-tan-100">
                <h3 className="text-lg font-serif text-tan-900">Payment Information</h3>
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium uppercase tracking-wide">Secure Payment</span>
                </div>
              </div>
              <p className="text-sm text-tan-600 mb-4">We never store your card information.</p>
              
              <SquarePaymentForm
                key="square-payment-form"
                amount={membershipPricing?.hasMembership && membershipPricing.paymentRequired 
                  ? membershipPricing.tanPrice 
                  : finalDepositAmount}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                isLoading={isLoading}
              />
              
              <div className="mt-4 pt-4 border-t border-tan-100 flex items-center justify-center gap-4 text-xs text-tan-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>PCI Compliant</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => {
                  // Cancel reservation when going back
                  const token = localStorage.getItem('token')
                  if (token && reservationSessionId) {
                    axios.post(
                      `${API_URL}/api/reservations/cancel`,
                      { sessionId: reservationSessionId },
                      { headers: { Authorization: `Bearer ${token}` } }
                    ).catch(err => {})
                  }
                  setReservationSessionId('')
                  setReservationExpiry(null)
                  setStep('details')
                }}
                className="w-full sm:flex-1 px-6 py-3 bg-white hover:bg-tan-50 text-tan-700 border-2 border-tan-300 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                disabled={isLoading}
              >
                Back to Details
              </button>
            </div>
          </div>
        )}

        {step === 'confirmation' && paymentResult && (
          <div className="card max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-b from-white to-tan-50">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-tan-500 to-tan-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-fade-in">
                  <svg className="w-10 h-10 text-white animate-slide-up" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-tan-400 rounded-full animate-ping opacity-20"></div>
              </div>
              <h2 className="text-3xl font-serif font-light text-tan-900 mb-3">Appointment Confirmed</h2>
              <p className="text-tan-700 text-lg">Your spray tan session has been successfully scheduled</p>
            </div>
            
            <div className="bg-white p-5 rounded-xl mb-6 border border-tan-200 shadow-sm">
              <h3 className="text-lg font-serif text-tan-900 mb-4 pb-2 border-b border-tan-100">Appointment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Date</span>
                  <span className="text-tan-900">{formatDateDisplay(bookingData.date)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Time</span>
                  <span className="text-tan-900">{formatTimeDisplay(bookingData.time)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Client</span>
                  <span className="text-tan-900">{bookingData.clientName}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-tan-600 font-medium">Contact</span>
                  <span className="text-tan-900">{bookingData.clientPhone}</span>
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-r from-tan-50 to-tan-100 p-5 rounded-xl mb-6 border border-tan-300 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-tan-200 rounded-full -mr-16 -mt-16 opacity-30"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-serif text-tan-900">
                    {membershipPricing?.hasMembership && membershipPricing.membershipType === 'included' 
                      ? 'Member Benefit Applied'
                      : paymentResult.amount === 0 
                      ? 'Promotional Discount Applied' 
                      : 'Payment Processed'}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                    membershipPricing?.hasMembership && membershipPricing.membershipType === 'included' 
                      ? 'bg-tan-700 text-white'
                      : paymentResult.amount === 0 
                      ? 'bg-tan-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    {membershipPricing?.hasMembership && membershipPricing.membershipType === 'included' 
                      ? 'Included'
                      : paymentResult.amount === 0 
                      ? 'Waived' 
                      : 'Paid'}
                  </span>
                </div>
                <div className="space-y-3">
                  {membershipPricing?.hasMembership && membershipPricing.membershipType === 'included' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Service Value</span>
                        <span className="text-tan-900 font-semibold">$65.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Member Benefit</span>
                        <span className="text-green-600 font-semibold">-$65.00</span>
                      </div>
                      <div className="pt-3 border-t border-tan-300">
                        <div className="flex justify-between items-center">
                          <span className="text-tan-900 font-semibold">Amount Due</span>
                          <span className="text-2xl font-bold text-tan-900">$0.00</span>
                        </div>
                        <p className="text-sm text-tan-600 mt-2">This appointment is included with your Sunday Club membership.</p>
                      </div>
                    </>
                  ) : membershipPricing?.hasMembership && membershipPricing.membershipType === 'additional' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Regular Price</span>
                        <span className="text-tan-600 line-through">$65.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Member Rate</span>
                        <span className="text-tan-900 font-semibold">$40.00</span>
                      </div>
                      <div className="pt-3 border-t border-tan-300">
                        <div className="flex justify-between items-center">
                          <span className="text-tan-900 font-semibold">Amount Paid</span>
                          <span className="text-2xl font-bold text-tan-900">$40.00</span>
                        </div>
                        <p className="text-sm text-tan-600 mt-2">Additional tan purchased at exclusive member rate. You saved $25!</p>
                      </div>
                    </>
                  ) : paymentResult.amount === 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Standard Deposit</span>
                        <span className="text-tan-600 line-through">$10.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Promocode Discount</span>
                        <span className="text-green-600 font-semibold">-$10.00</span>
                      </div>
                      <div className="pt-3 border-t border-tan-300">
                        <div className="flex justify-between items-center">
                          <span className="text-tan-900 font-semibold">Deposit Paid</span>
                          <span className="text-2xl font-bold text-tan-900">$0.00</span>
                        </div>
                        <p className="text-sm text-tan-600 mt-2">Your deposit has been waived. Balance of $55.00 due at appointment.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-tan-700">Deposit Amount</span>
                        <span className="text-tan-900 font-semibold">${paymentResult.amount?.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t border-tan-300">
                        <div className="flex justify-between items-center">
                          <span className="text-tan-900 font-semibold">Amount Paid</span>
                          <span className="text-2xl font-bold text-tan-900">${paymentResult.amount?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-tan-600 mt-2">Deposit secured. Remaining balance due at appointment.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl mb-6 border border-tan-200 shadow-sm">
              <h4 className="text-lg font-serif text-tan-900 mb-4 pb-2 border-b border-tan-100">Appointment Preparation</h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-tan-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-tan-700 font-semibold text-sm">1</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-tan-900 font-medium">Confirmation Message</p>
                    <p className="text-tan-600 text-sm mt-0.5">You will receive a text message confirmation shortly</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-tan-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-tan-700 font-semibold text-sm">2</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-tan-900 font-medium">Arrival Time</p>
                    <p className="text-tan-600 text-sm mt-0.5">Please arrive 5-10 minutes before your scheduled appointment</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-tan-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-tan-700 font-semibold text-sm">3</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-tan-900 font-medium">Payment Information</p>
                    <p className="text-tan-600 text-sm mt-0.5">
                      {membershipPricing?.hasMembership && membershipPricing.membershipType === 'included' ? (
                        'No payment required - this session is included with your membership'
                      ) : membershipPricing?.hasMembership && membershipPricing.membershipType === 'additional' ? (
                        'Payment complete - no additional amount due'
                      ) : paymentResult.amount === 0 ? (
                        'Balance of $55.00 due at appointment (cash or card accepted)'
                      ) : (
                        'Remaining balance of $55.00 due at appointment (cash or card accepted)'
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-tan-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-tan-700 font-semibold text-sm">4</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-tan-900 font-medium">What to Wear</p>
                    <p className="text-tan-600 text-sm mt-0.5">Dark, loose-fitting clothing you don't mind getting solution on</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-tan-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-tan-700 font-semibold text-sm">5</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-tan-900 font-medium">Pre-Tan Preparation</p>
                    <p className="text-tan-600 text-sm mt-0.5">Review the tan care instructions before your appointment for the best results</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
              <Link
                href="/care"
                className="w-full sm:w-auto px-8 py-3 bg-tan-700 hover:bg-tan-800 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
              >
                View Tan Care Instructions
              </Link>
              <button
                onClick={resetBookingFlow}
                className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-tan-50 text-tan-700 border-2 border-tan-300 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md text-center"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  )
}