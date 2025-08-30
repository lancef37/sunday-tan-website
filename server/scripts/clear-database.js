const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import all models
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const User = require('../models/User');
const Membership = require('../models/Membership');
const MembershipPayment = require('../models/MembershipPayment');
const MembershipUsage = require('../models/MembershipUsage');
const MembershipDiscount = require('../models/MembershipDiscount');
const PromoCode = require('../models/PromoCode');
const PromoCodeUsage = require('../models/PromoCodeUsage');
const Referral = require('../models/Referral');
const TempReservation = require('../models/TempReservation');
const Expense = require('../models/Expense');

async function clearDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan';
    console.log('Connecting to MongoDB...');
    console.log('Using URI:', mongoUri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')); // Hide credentials in output
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');

    // Clear all collections
    console.log('\nClearing database collections...\n');

    // Clear bookings
    const bookingsDeleted = await Booking.deleteMany({});
    console.log(`✓ Deleted ${bookingsDeleted.deletedCount} bookings`);

    // Clear clients
    const clientsDeleted = await Client.deleteMany({});
    console.log(`✓ Deleted ${clientsDeleted.deletedCount} clients`);

    // Clear users
    const usersDeleted = await User.deleteMany({});
    console.log(`✓ Deleted ${usersDeleted.deletedCount} users`);

    // Clear memberships
    const membershipsDeleted = await Membership.deleteMany({});
    console.log(`✓ Deleted ${membershipsDeleted.deletedCount} memberships`);

    // Clear membership payments
    const paymentsDeleted = await MembershipPayment.deleteMany({});
    console.log(`✓ Deleted ${paymentsDeleted.deletedCount} membership payments`);

    // Clear membership usage
    const usageDeleted = await MembershipUsage.deleteMany({});
    console.log(`✓ Deleted ${usageDeleted.deletedCount} membership usage records`);

    // Clear membership discounts
    const discountsDeleted = await MembershipDiscount.deleteMany({});
    console.log(`✓ Deleted ${discountsDeleted.deletedCount} membership discounts`);

    // Clear promo codes
    const promoCodesDeleted = await PromoCode.deleteMany({});
    console.log(`✓ Deleted ${promoCodesDeleted.deletedCount} promo codes`);

    // Clear promo code usage
    const promoUsageDeleted = await PromoCodeUsage.deleteMany({});
    console.log(`✓ Deleted ${promoUsageDeleted.deletedCount} promo code usage records`);

    // Clear referrals
    const referralsDeleted = await Referral.deleteMany({});
    console.log(`✓ Deleted ${referralsDeleted.deletedCount} referrals`);

    // Clear temporary reservations
    const tempReservationsDeleted = await TempReservation.deleteMany({});
    console.log(`✓ Deleted ${tempReservationsDeleted.deletedCount} temporary reservations`);

    // Clear expenses
    const expensesDeleted = await Expense.deleteMany({});
    console.log(`✓ Deleted ${expensesDeleted.deletedCount} expenses`);

    console.log('\n✅ Database cleared successfully!\n');
    console.log('All clients, appointments, subscriptions, referrals, and related data have been removed.');
    console.log('You can now start with a fresh slate.');

  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
clearDatabase();