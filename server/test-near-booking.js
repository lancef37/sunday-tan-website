const mongoose = require('mongoose')
const Booking = require('./models/Booking')
const { generateCancellationToken } = require('./routes/cancellations')
require('dotenv').config()

async function createNearBooking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    // Create a booking within 48 hours (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const booking = new Booking({
      date: dateStr,
      time: '14:00',
      clientName: 'Near Booking Test',
      clientPhone: '555-NEAR-TEST',
      clientEmail: 'neartest@example.com',
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: 'mock_payment_near',
      smsConsent: true
    })
    await booking.save()
    console.log('Created near-appointment booking:', booking._id)

    // Generate cancellation token
    const cancellationToken = await generateCancellationToken(booking._id)
    console.log('Generated cancellation token:', cancellationToken)
    
    console.log(`\nTest near booking cancellation URL: http://localhost:5000/api/cancel/${cancellationToken}`)
    console.log(`\nBooking details:`)
    console.log(`- ID: ${booking._id}`)
    console.log(`- Date: ${booking.date} (within 48 hours)`)
    console.log(`- Time: ${booking.time}`)
    console.log(`- Should NOT be refund eligible`)
    
    await mongoose.disconnect()
    console.log('\nNear booking test setup complete!')
    
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

createNearBooking()