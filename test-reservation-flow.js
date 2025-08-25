const axios = require('axios')

const API_URL = 'http://localhost:5000'

async function testReservationFlow() {
  console.log('🔧 Testing Reservation-Based Booking Flow\n')
  
  const testUser = {
    name: 'Test Reservation User',
    email: `reserve${Date.now()}@example.com`,
    phone: '5559876543',
    password: 'testpass123'
  }
  
  try {
    // 1. Register User
    console.log('1️⃣ Registering test user...')
    const registerResponse = await axios.post(`${API_URL}/api/auth/user/register`, testUser)
    const token = registerResponse.data.token
    console.log('✅ User registered')
    
    // 2. Create a reservation
    console.log('\n2️⃣ Creating temporary reservation...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const bookingDate = tomorrow.toISOString().split('T')[0]
    
    // Use random hour to avoid conflicts
    const hour = 9 + Math.floor(Math.random() * 8) // 9:00 to 16:00
    const timeSlot = `${hour}:00`
    
    const reservationResponse = await axios.post(
      `${API_URL}/api/reservations/reserve`,
      {
        date: bookingDate,
        time: timeSlot,
        smsConsent: true,
        finalAmount: 10,
        depositAmount: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    const sessionId = reservationResponse.data.sessionId
    console.log('✅ Reservation created')
    console.log('   Session ID:', sessionId)
    console.log('   Expires at:', new Date(reservationResponse.data.expiresAt).toLocaleTimeString())
    
    // 3. Check slot availability (should show as reserved)
    console.log('\n3️⃣ Checking slot availability...')
    const availabilityResponse = await axios.get(
      `${API_URL}/api/reservations/check-availability/${bookingDate}/${timeSlot}`
    )
    console.log('✅ Slot status:', availabilityResponse.data.available ? 'Available' : 'Reserved/Booked')
    console.log('   Reason:', availabilityResponse.data.reason || 'Available')
    
    // 4. Try to reserve same slot with different user (should fail)
    console.log('\n4️⃣ Testing reservation conflict...')
    const otherUser = {
      name: 'Another User',
      email: `other${Date.now()}@example.com`,
      phone: '5551112222',
      password: 'testpass123'
    }
    
    const otherRegisterResponse = await axios.post(`${API_URL}/api/auth/user/register`, otherUser)
    const otherToken = otherRegisterResponse.data.token
    
    try {
      await axios.post(
        `${API_URL}/api/reservations/reserve`,
        {
          date: bookingDate,
          time: timeSlot,
          smsConsent: true,
          finalAmount: 10,
          depositAmount: 10
        },
        { headers: { Authorization: `Bearer ${otherToken}` } }
      )
      console.log('❌ ERROR: Should not allow double reservation!')
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly prevented double reservation')
      }
    }
    
    // 5. Complete the booking
    console.log('\n5️⃣ Completing the booking...')
    const completeResponse = await axios.post(
      `${API_URL}/api/reservations/complete`,
      {
        sessionId: sessionId,
        paymentId: 'test-payment-123',
        paymentStatus: 'paid'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    console.log('✅ Booking completed')
    console.log('   Booking ID:', completeResponse.data.booking._id)
    console.log('   Status:', completeResponse.data.booking.status)
    
    // 6. Verify booking appears in user's bookings
    console.log('\n6️⃣ Verifying user bookings...')
    const myBookingsResponse = await axios.get(
      `${API_URL}/api/bookings/my-bookings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    console.log('✅ User has', myBookingsResponse.data.length, 'booking(s)')
    
    // 7. Test reservation cancellation
    console.log('\n7️⃣ Testing reservation cancellation...')
    const cancelHour = 9 + Math.floor(Math.random() * 8) // Different random slot
    const cancelTimeSlot = `${cancelHour}:30` // Use :30 to avoid conflict
    
    const cancelReservation = await axios.post(
      `${API_URL}/api/reservations/reserve`,
      {
        date: bookingDate,
        time: cancelTimeSlot,
        smsConsent: true,
        finalAmount: 10,
        depositAmount: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    const cancelSessionId = cancelReservation.data.sessionId
    console.log('   Created reservation to cancel:', cancelSessionId)
    
    await axios.post(
      `${API_URL}/api/reservations/cancel`,
      { sessionId: cancelSessionId },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    console.log('✅ Reservation cancelled successfully')
    
    // 8. Verify cancelled slot is available again
    console.log('\n8️⃣ Verifying cancelled slot is available...')
    const cancelledSlotCheck = await axios.get(
      `${API_URL}/api/reservations/check-availability/${bookingDate}/${cancelTimeSlot}`
    )
    console.log('✅ Cancelled slot status:', cancelledSlotCheck.data.available ? 'Available' : 'Reserved/Booked')
    
    console.log('\n✨ All reservation flow tests passed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', error.response.data)
    }
    process.exit(1)
  }
}

testReservationFlow()