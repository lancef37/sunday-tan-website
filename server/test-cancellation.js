const mongoose = require('mongoose')
const Booking = require('./models/Booking')
const { generateCancellationToken } = require('./routes/cancellations')
require('dotenv').config()

async function testCancellation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    // Find an existing pending booking
    let booking = await Booking.findOne({ status: 'pending' })
    
    if (!booking) {
      console.log('No pending booking found, creating one...')
      booking = new Booking({
        date: '2025-08-05',
        time: '16:00',
        clientName: 'Test Cancellation User',
        clientPhone: '555-TEST-CANCEL',
        clientEmail: 'testcancel@example.com',
        status: 'pending',
        smsConsent: true
      })
      await booking.save()
      console.log('Created test booking:', booking._id)
    }

    // Approve the booking and generate cancellation token
    booking.status = 'confirmed'
    await booking.save()
    
    const cancellationToken = await generateCancellationToken(booking._id)
    console.log('Generated cancellation token:', cancellationToken)
    
    // Fetch the booking with the token
    const updatedBooking = await Booking.findById(booking._id)
    console.log('Booking cancellation token:', updatedBooking.cancellationToken)
    
    // Test the cancellation URL
    const baseUrl = 'http://localhost:5000'
    console.log(`\nTest cancellation URL: ${baseUrl}/api/cancel/${cancellationToken}`)
    console.log(`\nBooking details:`)
    console.log(`- ID: ${booking._id}`)
    console.log(`- Date: ${booking.date}`)
    console.log(`- Time: ${booking.time}`)
    console.log(`- Client: ${booking.clientName}`)
    console.log(`- Status: ${booking.status}`)
    
    await mongoose.disconnect()
    console.log('\nTest setup complete! Use the URL above to test cancellation.')
    
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

testCancellation()