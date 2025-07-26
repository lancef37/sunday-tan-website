'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

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
}

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Value>(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [bookingData, setBookingData] = useState<BookingData>({
    date: '',
    time: '',
    clientName: '',
    clientPhone: '',
    clientEmail: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'calendar' | 'details' | 'payment'>('calendar')

  const API_URL = process.env.NEXT_PUBLIC_API_URL

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

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('payment')
  }

  const handlePayment = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/bookings`, bookingData)
      
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl
      } else {
        alert('Booking submitted! You will receive a confirmation shortly.')
        setStep('calendar')
        setBookingData({
          date: '',
          time: '',
          clientName: '',
          clientPhone: '',
          clientEmail: ''
        })
        setSelectedTime('')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('There was an error processing your booking. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-light text-tan-900 mb-4">Book Your Session</h1>
          <p className="text-tan-600 mb-8">Schedule your professional spray tan experience</p>
          <div className="flex justify-center space-x-4 mb-6">
            <div className={`px-6 py-3 rounded-full ${step === 'calendar' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              1. Select Date & Time
            </div>
            <div className={`px-6 py-3 rounded-full ${step === 'details' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              2. Your Details
            </div>
            <div className={`px-6 py-3 rounded-full ${step === 'payment' ? 'bg-tan-700 text-white shadow-lg' : 'bg-white text-tan-600 border border-tan-200'} transition-all duration-300`}>
              3. Payment
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
                  <h3 className="text-lg font-semibold mb-4">Available Times</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border transition-all duration-300 ${
                          slot.available
                            ? 'border-tan-300 hover:bg-tan-700 hover:text-white hover:border-tan-700 bg-white text-tan-700'
                            : 'border-tan-200 bg-tan-50 text-tan-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Your Information</h2>
            <p className="text-gray-600 mb-6">
              Selected: {bookingData.date} at {bookingData.time}
            </p>
            
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.clientName}
                  onChange={(e) => setBookingData({...bookingData, clientName: e.target.value})}
                  className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 focus:border-tan-500 transition-all duration-300 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingData.clientPhone}
                  onChange={(e) => setBookingData({...bookingData, clientPhone: e.target.value})}
                  className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 focus:border-tan-500 transition-all duration-300 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={bookingData.clientEmail}
                  onChange={(e) => setBookingData({...bookingData, clientEmail: e.target.value})}
                  className="w-full px-4 py-3 border border-tan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tan-500 focus:border-tan-500 transition-all duration-300 bg-white"
                />
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
                  className="btn-primary flex-1"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'payment' && (
          <div className="card max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Payment & Confirmation</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Booking Summary</h3>
              <p><strong>Date:</strong> {bookingData.date}</p>
              <p><strong>Time:</strong> {bookingData.time}</p>
              <p><strong>Name:</strong> {bookingData.clientName}</p>
              <p><strong>Phone:</strong> {bookingData.clientPhone}</p>
              <p><strong>Email:</strong> {bookingData.clientEmail}</p>
              <p className="text-lg font-semibold mt-4"><strong>Deposit Required:</strong> $25.00</p>
            </div>
            
            <div className="text-sm text-gray-600 mb-6">
              <p>• A $25 deposit is required to secure your appointment</p>
              <p>• The remaining balance will be collected at the time of service</p>
              <p>• Your appointment will be confirmed once payment is processed</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setStep('details')}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handlePayment}
                className="btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Pay Deposit & Book'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}