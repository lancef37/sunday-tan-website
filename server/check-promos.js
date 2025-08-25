const mongoose = require('mongoose')
const PromoCode = require('./models/PromoCode')
require('dotenv').config()

async function checkPromos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan')
    console.log('Connected to MongoDB')

    const promos = await PromoCode.find({})
    console.log('Existing promocodes:', promos.length)
    promos.forEach(promo => {
      console.log(`- ${promo.code}: ${promo.discountType} ${promo.discountValue}`)
    })
    
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error:', error)
    await mongoose.disconnect()
  }
}

checkPromos()