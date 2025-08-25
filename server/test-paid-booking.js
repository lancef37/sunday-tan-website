const mongoose = require('mongoose')
const Booking = require('./models/Booking')
const { generateCancellationToken } = require('./routes/cancellations')
require('dotenv').config()

async function createPaidBooking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    // Create a booking with payment
    const booking = new Booking({
      date: '2025-08-10', // Far future date for refund eligibility
      time: '15:00',
      clientName: 'Paid Test User',
      clientPhone: '555-PAID-TEST',
      clientEmail: 'paidtest@example.com',
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: 'mock_payment_12345', // Mock payment ID
      smsConsent: true
    })
    await booking.save()
    console.log('Created paid test booking:', booking._id)

    // Generate cancellation token
    const cancellationToken = await generateCancellationToken(booking._id)
    console.log('Generated cancellation token:', cancellationToken)
    
    console.log(`\nTest paid booking cancellation URL: http://localhost:5000/api/cancel/${cancellationToken}`)
    console.log(`\nBooking details:`)
    console.log(`- ID: ${booking._id}`)
    console.log(`- Date: ${booking.date}`)
    console.log(`- Time: ${booking.time}`)
    console.log(`- Client: ${booking.clientName}`)
    console.log(`- Payment Status: ${booking.paymentStatus}`)
    console.log(`- Payment ID: ${booking.paymentId}`)
    
    await mongoose.disconnect()
    console.log('\nPaid booking test setup complete!')
    
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

createPaidBooking()