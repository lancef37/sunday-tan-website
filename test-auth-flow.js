const axios = require('axios')

const API_URL = 'http://localhost:5000'

async function testAuthFlow() {
  console.log('🔧 Testing User Authentication Flow\n')
  
  const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    phone: '5551234567',
    password: 'testpass123'
  }
  
  try {
    // 1. Test Registration
    console.log('1️⃣ Testing Registration...')
    const registerResponse = await axios.post(`${API_URL}/api/auth/user/register`, testUser)
    console.log('✅ Registration successful')
    console.log('   User ID:', registerResponse.data.user.id)
    console.log('   Token received:', registerResponse.data.token ? 'Yes' : 'No')
    
    const token = registerResponse.data.token
    
    // 2. Test Login
    console.log('\n2️⃣ Testing Login...')
    const loginResponse = await axios.post(`${API_URL}/api/auth/user/login`, {
      email: testUser.email,
      password: testUser.password
    })
    console.log('✅ Login successful')
    console.log('   Token received:', loginResponse.data.token ? 'Yes' : 'No')
    
    // 3. Test Token Verification
    console.log('\n3️⃣ Testing Token Verification...')
    const verifyResponse = await axios.get(`${API_URL}/api/auth/user/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('✅ Token verification successful')
    console.log('   User data retrieved:', verifyResponse.data.user.email)
    
    // 4. Test Creating a Booking (authenticated)
    console.log('\n4️⃣ Testing Authenticated Booking...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const bookingDate = tomorrow.toISOString().split('T')[0]
    
    const bookingResponse = await axios.post(
      `${API_URL}/api/bookings`,
      {
        date: bookingDate,
        time: '14:00',
        smsConsent: true
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    console.log('✅ Booking created successfully')
    console.log('   Booking ID:', bookingResponse.data.booking._id)
    console.log('   Status:', bookingResponse.data.booking.status)
    
    // 5. Test Getting User's Bookings
    console.log('\n5️⃣ Testing Get User Bookings...')
    const myBookingsResponse = await axios.get(
      `${API_URL}/api/bookings/my-bookings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    console.log('✅ Retrieved user bookings')
    console.log('   Total bookings:', myBookingsResponse.data.length)
    
    // 6. Test Unauthenticated Booking (should fail)
    console.log('\n6️⃣ Testing Unauthenticated Booking (should fail)...')
    try {
      await axios.post(`${API_URL}/api/bookings`, {
        date: bookingDate,
        time: '15:00',
        smsConsent: true
      })
      console.log('❌ ERROR: Unauthenticated booking should have failed!')
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated booking')
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error || error.message)
      }
    }
    
    // 7. Test Password Reset Flow
    console.log('\n7️⃣ Testing Password Reset Request...')
    const resetResponse = await axios.post(`${API_URL}/api/auth/user/forgot-password`, {
      email: testUser.email
    })
    console.log('✅ Password reset email requested')
    console.log('   Response:', resetResponse.data.message)
    
    console.log('\n✨ All authentication tests passed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message)
    process.exit(1)
  }
}

testAuthFlow()