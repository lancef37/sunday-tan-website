'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import SquarePaymentForm from '../../components/SquarePaymentForm'
import ProtectedRoute from '../../components/ProtectedRoute'

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
  description?: string;
  discountAmount?: number;
  finalAmount?: number;
  error?: string;
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
    smsConsent: false,
    promoCode: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'calendar' | 'details' | 'payment' | 'confirmation'>('calendar')
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [depositAmount, setDepositAmount] = useState(10)
  const [finalDepositAmount, setFinalDepositAmount] = useState(10)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [reservationSessionId, setReservationSessionId] = useState<string>('')
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

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

  const fetchAvailableSlots = async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await axios.get(`${API_URL}/api/slots/${dateStr}`)
      setAvailableSlots(response.data)
    } catch (error) {
      console.error('Error fetching slots:', error)
      setAvailableSlots(generateDefaultSlots())
    }
  }

  const formatTimeDisplay = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
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
        date: selectedDate.toISOString().split('T')[0],
        time: time
      })
      setStep('details')
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
        amount: depositAmount
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
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validatePromoCode(value)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  const applyPromoCode = () => {
    if (promoValidation?.valid) {
      setBookingData({
        ...bookingData,
        promoCode: promoValidation.code
      })
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
    
    // Prepare reservation data with promocode
    const reservationData = {
      date: bookingData.date,
      time: bookingData.time,
      smsConsent: bookingData.smsConsent,
      promoCode: promoValidation?.valid ? promoValidation.code : undefined,
      finalAmount: finalDepositAmount,
      depositAmount: depositAmount
    }
    
    // Create temporary reservation instead of booking
    setIsLoading(true)
    try {
      console.log('Creating reservation:', `${API_URL}/api/reservations/reserve`)
      console.log('Reservation data:', reservationData)
      const response = await axios.post(
        `${API_URL}/api/reservations/reserve`, 
        reservationData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setReservationSessionId(response.data.sessionId)
      setReservationExpiry(new Date(response.data.expiresAt))
      console.log('Reservation created with session:', response.data.sessionId)
      
      // Skip payment if deposit is fully waived by promocode
      if (finalDepositAmount <= 0) {
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
                code: promoValidation.code
              })
            } catch (error) {
              console.error('Error applying promocode:', error)
            }
          }
          
          setPaymentResult({
            success: true,
            message: 'Deposit waived by promocode',
            amount: 0
          })
          setStep('confirmation')
        } catch (completeError) {
          console.error('Error completing booking:', completeError)
          alert('Failed to complete booking. Please try again.')
        }
      } else {
        setStep('payment')
      }
    } catch (error: any) {
      console.error('Error creating reservation:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
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
      // First process the payment
      const paymentResponse = await axios.post(`${API_URL}/api/payments/process-deposit`, {
        sourceId: paymentData.sourceId,
        amount: finalDepositAmount,
        promoCode: promoValidation?.valid ? promoValidation.code : undefined
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
      console.error('Payment/booking error:', error)
      alert(error.response?.data?.message || 'Payment or booking failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error)
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
        ).catch(err => console.log('Failed to cancel reservation:', err))
      }
    }
    
    setStep('calendar')
    setBookingData({
      date: '',
      time: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      smsConsent: false,
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
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-light text-tan-900 mb-4">Book Your Session</h1>
          <p className="text-tan-600 mb-8">Schedule your professional spray tan experience</p>
          <div className="flex justify-center space-x-2 mb-6 flex-wrap">
            <div className={`px-4 py-2 rounded-full text-sm ${step === 'calendar' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              1. Date & Time
            </div>
            <div className={`px-4 py-2 rounded-full text-sm ${step === 'details' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              2. Details
            </div>
            <div className={`px-4 py-2 rounded-full text-sm ${step === 'payment' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              3. {finalDepositAmount <= 0 ? 'Review' : 'Payment'}
            </div>
            <div className={`px-4 py-2 rounded-full text-sm ${step === 'confirmation' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              4. Confirmation
            </div>
          </div>
        </div>

        {step === 'calendar' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-center">Select Your Appointment Date</h2>
            
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <Calendar
                  onChange={handleDateChange}
                  value={selectedDate}
                  minDate={new Date()}
                  className="w-full"
                />
              </div>
              
              {selectedDate && (
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-4 text-tan-800">Available Times</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSlots
                      .filter(slot => slot.available)
                      .map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        className="p-4 rounded-xl border-2 border-tan-200 bg-white text-tan-700 hover:bg-tan-700 hover:text-white hover:border-tan-700 transition-all duration-300 shadow-sm hover:shadow-md font-medium text-center focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-offset-2"
                      >
                        {formatTimeDisplay(slot.time)}
                      </button>
                    ))}
                  </div>
                  {availableSlots.filter(slot => slot.available).length === 0 && (
                    <div className="text-center py-8 text-tan-600">
                      <p className="text-lg">No available times for this date</p>
                      <p className="text-sm mt-2">Please select a different date</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Your Information</h2>
            <div className="bg-tan-50 p-4 rounded-lg mb-6 border border-tan-200">
              <p className="text-tan-700 font-medium">
                Selected: {new Date(bookingData.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} at {formatTimeDisplay(bookingData.time)}
              </p>
            </div>
            
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {/* User info display - read only */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Account Information</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{bookingData.clientName}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <p className="text-gray-900 font-medium">{bookingData.clientPhone}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{bookingData.clientEmail}</p>
                </div>
              </div>
              
              {/* Promocode Section */}
              <div className="pt-4 border-t border-tan-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promocode (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={handlePromoCodeChange}
                    placeholder="Enter promocode"
                    className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 focus:border-tan-500 transition-all duration-300 bg-white"
                  />
                  {isValidatingPromo && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-tan-600"></div>
                    </div>
                  )}
                </div>
                
                {promoValidation && (
                  <div className="mt-2">
                    {promoValidation.valid ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-green-800">{promoValidation.code} Applied!</span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">{promoValidation.description}</p>
                        <p className="text-green-700 text-sm">
                          Discount: -${promoValidation.discountAmount?.toFixed(2)} | 
                          New deposit: ${promoValidation.finalAmount?.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-red-800">{promoValidation.error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deposit Information */}
              <div className="bg-tan-50 p-4 rounded-lg border border-tan-200">
                <h3 className="font-medium text-tan-900 mb-2">Deposit Required</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Deposit Amount:</span>
                  <div className="text-right">
                    {promoValidation?.valid && promoValidation.discountAmount! > 0 ? (
                      <>
                        <span className="text-gray-500 line-through text-sm">${depositAmount.toFixed(2)}</span>
                        <span className="text-tan-700 font-bold ml-2">${finalDepositAmount.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-tan-700 font-bold">${finalDepositAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  A refundable deposit is required to secure your appointment. Payment will be processed after confirmation.
                </p>
              </div>
              
              <div className="pt-4 border-t border-tan-200">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    required
                    checked={bookingData.smsConsent}
                    onChange={(e) => setBookingData({...bookingData, smsConsent: e.target.checked})}
                    className="mt-1 h-5 w-5 text-tan-600 border-tan-300 rounded focus:ring-tan-500 focus:ring-2 transition-all duration-200"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-700 group-hover:text-tan-700 transition-colors">
                      SMS Consent *
                    </span>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      I consent to receive appointment confirmation and reminder text messages at the phone number provided. Message and data rates may apply.
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('calendar')}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!bookingData.smsConsent}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    bookingData.smsConsent
                      ? 'bg-tan-700 hover:bg-tan-800 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Confirmation
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'payment' && reservationSessionId && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Secure Payment</h2>
            
            {/* Reservation Timer */}
            {timeRemaining > 0 && (
              <div className={`p-3 rounded-lg mb-4 ${
                timeRemaining < 60 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm font-medium ${
                  timeRemaining < 60 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  Time remaining to complete booking: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            
            <div className="bg-tan-50 p-4 rounded-lg mb-6 border border-tan-200">
              <h3 className="font-semibold mb-2 text-tan-800">Booking Summary</h3>
              <p><strong>Date:</strong> {new Date(bookingData.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> {formatTimeDisplay(bookingData.time)}</p>
              <p><strong>Name:</strong> {bookingData.clientName}</p>
              {promoValidation?.valid && (
                <p><strong>Promocode:</strong> {promoValidation.code} (${promoValidation.discountAmount?.toFixed(2)} discount)</p>
              )}
            </div>

            <SquarePaymentForm
              key="square-payment-form"
              amount={finalDepositAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              isLoading={isLoading}
            />

            <div className="flex space-x-4 pt-6">
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
                    ).catch(err => console.log('Failed to cancel reservation:', err))
                  }
                  setReservationSessionId('')
                  setReservationExpiry(null)
                  setStep('details')
                }}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Back to Details
              </button>
            </div>
          </div>
        )}

        {step === 'confirmation' && paymentResult && (
          <div className="card max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-green-800 mb-2">Booking Confirmed!</h2>
              <p className="text-green-700">Your appointment has been successfully booked and payment processed.</p>
            </div>
            
            <div className="bg-tan-50 p-4 rounded-lg mb-6 border border-tan-200">
              <h3 className="font-semibold mb-3 text-tan-800">Booking Details</h3>
              <div className="space-y-2">
                <p><strong>Date:</strong> {new Date(bookingData.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Time:</strong> {formatTimeDisplay(bookingData.time)}</p>
                <p><strong>Name:</strong> {bookingData.clientName}</p>
                <p><strong>Phone:</strong> {bookingData.clientPhone}</p>
                <p><strong>Email:</strong> {bookingData.clientEmail}</p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3">
                {paymentResult.amount === 0 ? '🎉 Deposit Waived' : '💳 Payment Confirmed'}
              </h4>
              <div className="space-y-2 text-sm text-green-700">
                {paymentResult.amount === 0 ? (
                  <>
                    <p>✅ Your deposit has been waived thanks to your promocode!</p>
                    <p>💰 <strong>Amount Paid:</strong> $0.00</p>
                    <p>📝 <strong>Note:</strong> Your appointment is confirmed and ready to go. The remaining service fee will be collected at your appointment.</p>
                  </>
                ) : (
                  <>
                    <p>✅ Your deposit payment has been successfully processed.</p>
                    <p>💰 <strong>Amount Paid:</strong> ${paymentResult.amount?.toFixed(2)}</p>
                    <p>📝 <strong>Note:</strong> The remaining service fee will be collected at your appointment.</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📋 What's Next?</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p>• You'll receive a confirmation text message shortly</p>
                <p>• Arrive 5-10 minutes early for your appointment</p>
                {paymentResult.amount === 0 ? (
                  <p>• Bring the full service fee of $25.00 (cash or card)</p>
                ) : (
                  <p>• Bring the remaining balance of $15.00 (cash or card)</p>
                )}
                <p>• Wear dark, loose-fitting clothes you don't mind getting tan solution on</p>
                <p>• Contact us if you need to reschedule</p>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={resetBookingFlow}
                className="btn-primary"
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