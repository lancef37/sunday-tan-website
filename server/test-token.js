const mongoose = require('mongoose')
const Booking = require('./models/Booking')
require('dotenv').config()

async function testToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    
    const booking = await Booking.findOne({ cancellationToken: 'bfd7f6b8-a9df-4992-b88a-c2c494a32d12' })
    console.log('Found booking:', booking ? 'Yes' : 'No')
    if (booking) {
      console.log('Booking details:', {
        id: booking._id,
        status: booking.status,
        cancellationToken: booking.cancellationToken,
        date: booking.date,
        time: booking.time
      })
    }
    
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

testToken()