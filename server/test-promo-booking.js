const mongoose = require('mongoose')
const Booking = require('./models/Booking')
const PromoCode = require('./models/PromoCode')
const { generateCancellationToken } = require('./routes/cancellations')
require('dotenv').config()

async function createPromoBooking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    // First create or find a promocode
    let promo = await PromoCode.findOne({ code: 'TESTCANCEL' })
    if (!promo) {
      promo = new PromoCode({
        code: 'TESTCANCEL',
        description: 'Test cancellation promocode',
        discountAmount: 10,
        maxUsage: 10,
        usageCount: 0,
        isActive: true
      })
      await promo.save()
      console.log('Created test promocode:', promo.code)
    }

    // Create a booking with promocode (no payment)
    const booking = new Booking({
      date: '2025-08-15', // Future date for refund eligibility
      time: '11:00',
      clientName: 'Promo Test User',
      clientPhone: '555-PROMO-TEST',
      clientEmail: 'promotest@example.com',
      status: 'confirmed',
      paymentStatus: 'pending', // No payment because promocode waived deposit
      promoCode: {
        code: 'TESTCANCEL',
        discountAmount: 10
      },
      finalAmount: 0, // Deposit waived
      smsConsent: true
    })
    await booking.save()
    console.log('Created promocode booking:', booking._id)

    // Generate cancellation token
    const cancellationToken = await generateCancellationToken(booking._id)
    console.log('Generated cancellation token:', cancellationToken)
    
    console.log(`\nTest promocode booking cancellation URL: http://localhost:5000/api/cancel/${cancellationToken}`)
    console.log(`\nBooking details:`)
    console.log(`- ID: ${booking._id}`)
    console.log(`- Date: ${booking.date}`)
    console.log(`- Time: ${booking.time}`)
    console.log(`- Client: ${booking.clientName}`)
    console.log(`- Promocode: ${booking.promoCode.code}`)
    console.log(`- Payment Status: ${booking.paymentStatus}`)
    console.log(`- Should be refund eligible but no payment to refund`)
    
    await mongoose.disconnect()
    console.log('\nPromo booking test setup complete!')
    
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

createPromoBooking()