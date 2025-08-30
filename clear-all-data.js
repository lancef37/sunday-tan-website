/**
 * Script to clear ALL data from the database
 * This will remove all users, bookings, clients, memberships, etc.
 * USE WITH CAUTION!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import all models - update paths to work from server directory
const path = require('path');
const modelsPath = path.join(__dirname, 'server', 'models');

const Booking = require(path.join(modelsPath, 'Booking'));
const Client = require(path.join(modelsPath, 'Client'));
const User = require(path.join(modelsPath, 'User'));
const PromoCode = require(path.join(modelsPath, 'PromoCode'));
const PromoCodeUsage = require(path.join(modelsPath, 'PromoCodeUsage'));
const TempReservation = require(path.join(modelsPath, 'TempReservation'));
const Availability = require(path.join(modelsPath, 'Availability'));
const BlockedSlot = require(path.join(modelsPath, 'BlockedSlot'));
const Expense = require(path.join(modelsPath, 'Expense'));
const Membership = require(path.join(modelsPath, 'Membership'));
const MembershipPayment = require(path.join(modelsPath, 'MembershipPayment'));
const MembershipUsage = require(path.join(modelsPath, 'MembershipUsage'));
const MembershipDiscount = require(path.join(modelsPath, 'MembershipDiscount'));
const Referral = require(path.join(modelsPath, 'Referral'));

async function clearAllData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('Collections to be cleared:');
    console.log('- Users (client accounts)');
    console.log('- Clients (booking records)');
    console.log('- Bookings');
    console.log('- Memberships and related data');
    console.log('- Promo codes and usage');
    console.log('- Referrals');
    console.log('- Temporary reservations');
    console.log('- Availability settings');
    console.log('- Blocked slots');
    console.log('- Expenses');
    console.log('');
    
    // Give user 5 seconds to cancel
    console.log('Starting cleanup in 5 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🧹 Starting database cleanup...\n');

    // Clear all collections
    const collections = [
      { model: User, name: 'Users' },
      { model: Client, name: 'Clients' },
      { model: Booking, name: 'Bookings' },
      { model: Membership, name: 'Memberships' },
      { model: MembershipPayment, name: 'Membership Payments' },
      { model: MembershipUsage, name: 'Membership Usage' },
      { model: MembershipDiscount, name: 'Membership Discounts' },
      { model: PromoCode, name: 'Promo Codes' },
      { model: PromoCodeUsage, name: 'Promo Code Usage' },
      { model: Referral, name: 'Referrals' },
      { model: TempReservation, name: 'Temporary Reservations' },
      { model: Availability, name: 'Availability Settings' },
      { model: BlockedSlot, name: 'Blocked Slots' },
      { model: Expense, name: 'Expenses' }
    ];

    for (const collection of collections) {
      const result = await collection.model.deleteMany({});
      console.log(`✅ Cleared ${collection.name}: ${result.deletedCount} documents deleted`);
    }

    console.log('\n🎉 Database cleanup complete!');
    console.log('All data has been removed. The database is now empty.');
    console.log('\nYou can now:');
    console.log('1. Create new user accounts');
    console.log('2. Test the booking system');
    console.log('3. Set up new memberships');
    console.log('4. Configure availability settings in admin');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

// Prompt for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=====================================');
console.log('    DATABASE COMPLETE RESET TOOL    ');
console.log('=====================================');
console.log('');
console.log('This will DELETE ALL DATA including:');
console.log('• All user accounts');
console.log('• All client records');
console.log('• All bookings');
console.log('• All memberships');
console.log('• All settings');
console.log('');

rl.question('Type "DELETE ALL" to confirm: ', (answer) => {
  if (answer === 'DELETE ALL') {
    rl.close();
    clearAllData();
  } else {
    console.log('Cancelled. No data was deleted.');
    rl.close();
    process.exit(0);
  }
});