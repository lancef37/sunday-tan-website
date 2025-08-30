require('dotenv').config()
const mongoose = require('mongoose')
const readline = require('readline')

// Import all models
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const Membership = require('../models/Membership')
const MembershipPayment = require('../models/MembershipPayment')
const MembershipDiscount = require('../models/MembershipDiscount')
const MembershipUsage = require('../models/MembershipUsage')
const Referral = require('../models/Referral')
const PromoCode = require('../models/PromoCode')
const PromoCodeUsage = require('../models/PromoCodeUsage')
const TempReservation = require('../models/TempReservation')
const User = require('../models/User')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    
    console.log('\n⚠️  WARNING: This will clear the following data from your database:')
    console.log('  - All bookings/appointments')
    console.log('  - All client records')
    console.log('  - All memberships and related data')
    console.log('  - All referrals')
    console.log('  - All promo codes and usage')
    console.log('  - All temporary reservations')
    console.log('  - All user accounts (except admin)')
    console.log('\nThis action cannot be undone!')
    
    // Check for --force flag to skip confirmation
    const forceFlag = process.argv.includes('--force')
    
    if (!forceFlag) {
      const answer = await question('\nAre you sure you want to continue? Type "yes" to confirm: ')
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Operation cancelled')
        process.exit(0)
      }
    } else {
      console.log('\n⚡ Running with --force flag, skipping confirmation...')
    }
    
    console.log('\n🧹 Starting database cleanup...\n')
    
    // Clear bookings and appointments
    const bookingsDeleted = await Booking.deleteMany({})
    console.log(`✓ Deleted ${bookingsDeleted.deletedCount} bookings/appointments`)
    
    // Delete all client records
    const clientsDeleted = await Client.deleteMany({})
    console.log(`✓ Deleted ${clientsDeleted.deletedCount} client records`)
    
    // Clear memberships and related data
    const membershipsDeleted = await Membership.deleteMany({})
    console.log(`✓ Deleted ${membershipsDeleted.deletedCount} memberships`)
    
    const membershipPaymentsDeleted = await MembershipPayment.deleteMany({})
    console.log(`✓ Deleted ${membershipPaymentsDeleted.deletedCount} membership payments`)
    
    const membershipDiscountsDeleted = await MembershipDiscount.deleteMany({})
    console.log(`✓ Deleted ${membershipDiscountsDeleted.deletedCount} membership discounts`)
    
    const membershipUsageDeleted = await MembershipUsage.deleteMany({})
    console.log(`✓ Deleted ${membershipUsageDeleted.deletedCount} membership usage records`)
    
    // Clear referrals
    const referralsDeleted = await Referral.deleteMany({})
    console.log(`✓ Deleted ${referralsDeleted.deletedCount} referrals`)
    
    // Clear promo codes (except system codes if any)
    const promoCodesDeleted = await PromoCode.deleteMany({})
    console.log(`✓ Deleted ${promoCodesDeleted.deletedCount} promo codes`)
    
    const promoCodeUsageDeleted = await PromoCodeUsage.deleteMany({})
    console.log(`✓ Deleted ${promoCodeUsageDeleted.deletedCount} promo code usage records`)
    
    // Clear temporary reservations
    const tempReservationsDeleted = await TempReservation.deleteMany({})
    console.log(`✓ Deleted ${tempReservationsDeleted.deletedCount} temporary reservations`)
    
    // Clear user accounts (keeping admin accounts)
    const usersDeleted = await User.deleteMany({ role: { $ne: 'admin' } })
    console.log(`✓ Deleted ${usersDeleted.deletedCount} user accounts (kept admin accounts)`)
    
    // Update users to remove membership references
    const usersUpdated = await User.updateMany(
      {},
      { 
        $set: { 
          membershipId: null,
          membershipStatus: null,
          lastBooking: null
        }
      }
    )
    console.log(`✓ Cleared membership data from ${usersUpdated.modifiedCount} remaining users`)
    
    console.log('\n✅ Database cleanup complete!')
    console.log('\n📝 Summary:')
    console.log('  - All test data has been cleared')
    console.log('  - Admin accounts have been preserved')
    console.log('  - The database is ready for fresh testing')
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message)
    process.exit(1)
  } finally {
    rl.close()
    await mongoose.disconnect()
    process.exit(0)
  }
}

// Run the cleanup
clearDatabase()