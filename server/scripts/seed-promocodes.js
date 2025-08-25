const mongoose = require('mongoose')
const PromoCode = require('../models/PromoCode')
require('dotenv').config({ path: '../../.env' })

const seedPromoCodes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log('Connected to MongoDB')
    
    // Check if sunday10 already exists
    const existingSunday10 = await PromoCode.findOne({ code: 'SUNDAY10' })
    
    if (existingSunday10) {
      console.log('SUNDAY10 promocode already exists')
    } else {
      // Create the sunday10 promocode
      const sunday10 = new PromoCode({
        code: 'SUNDAY10',
        description: 'Sunday Tan Launch Special - Free Deposit',
        discountType: 'fixed',
        discountValue: 10,
        isActive: true,
        usageLimit: null, // Unlimited usage for now
        validFrom: new Date(),
        validUntil: null // No expiration for now
      })
      
      await sunday10.save()
      console.log('SUNDAY10 promocode created successfully')
    }
    
    // Display all promocodes
    const allPromoCodes = await PromoCode.find({})
    console.log('\nAll promocodes in database:')
    allPromoCodes.forEach(promo => {
      console.log(`- ${promo.code}: ${promo.description} (${promo.discountType} $${promo.discountValue})`)
    })
    
    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    
  } catch (error) {
    console.error('Error seeding promocodes:', error)
    process.exit(1)
  }
}

// Run the seeding script
seedPromoCodes()