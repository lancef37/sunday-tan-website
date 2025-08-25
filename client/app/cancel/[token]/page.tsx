'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

interface BookingDetails {
  id: string
  date: string
  time: string
  clientName: string
  clientPhone: string
  hoursUntilAppointment: number
  isRefundEligible: boolean
  hasPayment: boolean
  depositAmount: number
  refundAmount: number
}

interface CancellationResult {
  success: boolean
  message: string
  refundStatus: string
  refundAmount: number
  isRefundEligible: boolean
  hoursUntilAppointment: number
}

export default function CancellationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellationResult, setCancellationResult] = useState<CancellationResult | null>(null)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (token) {
      fetchBookingDetails()
    }
  }, [token])

  const fetchBookingDetails = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`${API_URL}/api/cancel/${token}`)
      setBooking(response.data.booking)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load booking details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancellation = async () => {
    try {
      setIsProcessing(true)
      const response = await axios.post(`${API_URL}/api/cancel/${token}`, {
        confirmCancel: true
      })
      setCancellationResult(response.data)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to process cancellation')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTimeDisplay = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan-600 mx-auto mb-4"></div>
            <p className="text-tan-700">Loading booking details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-red-800 mb-2">Unable to Process</h1>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cancellationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-green-800 mb-2">Cancellation Confirmed</h1>
            <p className="text-green-700 mb-6">Your appointment has been successfully cancelled.</p>
            
            <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200 text-left">
              <h3 className="font-semibold text-green-800 mb-3">Cancellation Details</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>• <strong>Cancellation Time:</strong> {cancellationResult.hoursUntilAppointment.toFixed(1)} hours before appointment</p>
                {cancellationResult.refundStatus === 'processed' && (
                  <p>• <strong>Refund:</strong> ${cancellationResult.refundAmount.toFixed(2)} will appear in your account within 3-5 business days</p>
                )}
                {cancellationResult.refundStatus === 'not_applicable' && (
                  <p>• <strong>Refund:</strong> Not applicable (promocode booking - no deposit charged)</p>
                )}
                {cancellationResult.refundStatus === 'none' && (
                  <p>• <strong>Refund:</strong> Not available (cancelled within 48 hours of appointment)</p>
                )}
                {cancellationResult.refundStatus === 'failed' && (
                  <p>• <strong>Refund:</strong> There was an issue processing your refund. We'll contact you within 24 hours.</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200 text-left">
              <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• You'll receive a confirmation text message shortly</p>
                <p>• Your appointment slot is now available for other clients</p>
                <p>• Feel free to book again anytime at sundaytan.com</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/book')}
                className="btn-primary w-full"
              >
                Book a New Appointment
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary w-full"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-orange-800 mb-2">Cancel Appointment</h1>
            <p className="text-orange-700">Are you sure you want to cancel your appointment?</p>
          </div>

          <div className="bg-tan-50 p-4 rounded-lg mb-6 border border-tan-200">
            <h3 className="font-semibold text-tan-800 mb-3">Appointment Details</h3>
            <div className="space-y-2">
              <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> {formatTimeDisplay(booking.time)}</p>
              <p><strong>Name:</strong> {booking.clientName}</p>
              <p><strong>Hours Until Appointment:</strong> {booking.hoursUntilAppointment.toFixed(1)} hours</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg mb-6 border ${
            booking.isRefundEligible 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              booking.isRefundEligible ? 'text-green-800' : 'text-red-800'
            }`}>
              Refund Policy
            </h4>
            <div className={`text-sm space-y-2 ${
              booking.isRefundEligible ? 'text-green-700' : 'text-red-700'
            }`}>
              {booking.isRefundEligible ? (
                <>
                  <p>✅ <strong>Good news!</strong> You're cancelling more than 48 hours before your appointment.</p>
                  {booking.hasPayment ? (
                    <p>💰 <strong>Refund Amount:</strong> ${booking.refundAmount.toFixed(2)} will be refunded to your original payment method within 3-5 business days.</p>
                  ) : (
                    <p>💰 <strong>No Refund Needed:</strong> Since no deposit was charged for your promocode booking, there's nothing to refund.</p>
                  )}
                </>
              ) : (
                <>
                  <p>⚠️ <strong>Note:</strong> You're cancelling within 48 hours of your appointment.</p>
                  <p>💰 <strong>No Refund:</strong> Per our cancellation policy, deposits are non-refundable within 48 hours.</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCancellation}
              disabled={isProcessing}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Cancellation...
                </div>
              ) : (
                'Yes, Cancel My Appointment'
              )}
            </button>
            
            <button
              onClick={() => router.push('/')}
              disabled={isProcessing}
              className="btn-secondary w-full"
            >
              Keep My Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}