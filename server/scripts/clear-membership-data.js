require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const MembershipUsage = require('../models/MembershipUsage');
const MembershipPayment = require('../models/MembershipPayment');
const MembershipDiscount = require('../models/MembershipDiscount');

async function clearMembershipData() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB Atlas');
    console.log('Starting to clear membership data...\n');

    // Clear all membership-related collections
    const results = await Promise.all([
      Membership.deleteMany({}).then(res => ({ collection: 'Memberships', deleted: res.deletedCount })),
      MembershipUsage.deleteMany({}).then(res => ({ collection: 'MembershipUsages', deleted: res.deletedCount })),
      MembershipPayment.deleteMany({}).then(res => ({ collection: 'MembershipPayments', deleted: res.deletedCount })),
      MembershipDiscount.deleteMany({}).then(res => ({ collection: 'MembershipDiscounts', deleted: res.deletedCount }))
    ]);

    // Display results
    console.log('=== Membership Data Cleared ===');
    results.forEach(result => {
      console.log(`✓ ${result.collection}: ${result.deleted} documents deleted`);
    });

    // Also clear membership references from clients
    const Client = require('../models/Client');
    const clientUpdate = await Client.updateMany(
      { membership: { $exists: true } },
      { $unset: { membership: 1, membershipStatus: 1, membershipStartDate: 1, membershipEndDate: 1 } }
    );
    console.log(`✓ Clients: ${clientUpdate.modifiedCount} membership references removed`);

    // Clear membership references from bookings
    const Booking = require('../models/Booking');
    const bookingUpdate = await Booking.updateMany(
      { membershipApplied: true },
      { $set: { membershipApplied: false }, $unset: { membershipId: 1 } }
    );
    console.log(`✓ Bookings: ${bookingUpdate.modifiedCount} membership references removed`);

    console.log('\n✅ All membership data has been successfully cleared!');
    console.log('The database is ready for fresh membership testing.\n');

  } catch (error) {
    console.error('Error clearing membership data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
clearMembershipData();