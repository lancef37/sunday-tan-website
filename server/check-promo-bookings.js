const mongoose = require('mongoose')
const Booking = require('./models/Booking')
const { generateCancellationToken } = require('./routes/cancellations')
require('dotenv').config()

async function checkPromoBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    const bookings = await Booking.find({ 'promoCode.code': { $exists: true, $ne: null } })
    console.log('Bookings with promocodes:', bookings.length)
    
    if (bookings.length > 0) {
      const booking = bookings[0]
      console.log('Found promocode booking:', {
        id: booking._id,
        status: booking.status,
        date: booking.date,
        time: booking.time,
        promoCode: booking.promoCode?.code,
        paymentStatus: booking.paymentStatus
      })
      
      if (booking.status === 'confirmed' && !booking.cancellationToken) {
        const token = await generateCancellationToken(booking._id)
        console.log(`Generated cancellation token: ${token}`)
        console.log(`Test URL: http://localhost:5000/api/cancel/${token}`)
      } else if (booking.cancellationToken) {
        console.log(`Existing token: ${booking.cancellationToken}`)
        console.log(`Test URL: http://localhost:5000/api/cancel/${booking.cancellationToken}`)
      }
    } else {
      console.log('No promocode bookings found')
    }
    
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

checkPromoBookings()