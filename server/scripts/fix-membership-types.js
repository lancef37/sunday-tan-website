const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Membership = require('../models/Membership');
const MembershipUsage = require('../models/MembershipUsage');
const User = require('../models/User');
require('dotenv').config({ path: '../../.env' });

async function fixMembershipTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan');
    console.log('Connected to MongoDB');

    // Find all bookings with membershipApplied but missing or incorrect membershipType
    const bookings = await Booking.find({
      membershipApplied: true,
      membershipStatusAtBooking: 'member',
      status: { $in: ['pending', 'confirmed', 'completed'] }
    }).sort({ date: 1, time: 1 }); // Sort chronologically

    console.log(`Found ${bookings.length} membership bookings to check`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    // Group bookings by user
    const bookingsByUser = {};
    for (const booking of bookings) {
      if (!booking.userId) continue;
      const userId = booking.userId.toString();
      if (!bookingsByUser[userId]) {
        bookingsByUser[userId] = [];
      }
      bookingsByUser[userId].push(booking);
    }

    // Process each user's bookings
    for (const [userId, userBookings] of Object.entries(bookingsByUser)) {
      console.log(`\nProcessing user ${userId} with ${userBookings.length} bookings`);
      
      const user = await User.findById(userId);
      if (!user) {
        console.log(`  User not found, skipping`);
        continue;
      }

      // Get user's membership
      const membership = await Membership.findOne({
        userId: userId,
        $or: [
          { status: 'active' },
          { status: 'past_due' },
          { status: 'cancelled' }
        ]
      });

      if (!membership) {
        console.log(`  No membership found for user ${user.name}, skipping`);
        continue;
      }

      // Group bookings by billing cycle
      const bookingsByCycle = {};
      for (const booking of userBookings) {
        const bookingDate = new Date(booking.date);
        
        // Find which billing cycle this booking belongs to
        let cycleKey = null;
        
        // Check current cycle
        if (bookingDate >= membership.billingCycleStart && bookingDate <= membership.billingCycleEnd) {
          cycleKey = `${membership.billingCycleStart.toISOString()}_${membership.billingCycleEnd.toISOString()}`;
        } else {
          // Calculate which past cycle this belongs to
          const startDate = new Date(membership.startDate);
          let cycleStart = new Date(startDate);
          let cycleEnd = new Date(startDate);
          cycleEnd.setMonth(cycleEnd.getMonth() + 1);
          
          while (cycleStart <= new Date()) {
            if (bookingDate >= cycleStart && bookingDate < cycleEnd) {
              cycleKey = `${cycleStart.toISOString()}_${cycleEnd.toISOString()}`;
              break;
            }
            cycleStart.setMonth(cycleStart.getMonth() + 1);
            cycleEnd.setMonth(cycleEnd.getMonth() + 1);
          }
        }
        
        if (!cycleKey) {
          console.log(`  Could not determine billing cycle for booking ${booking._id}`);
          continue;
        }
        
        if (!bookingsByCycle[cycleKey]) {
          bookingsByCycle[cycleKey] = [];
        }
        bookingsByCycle[cycleKey].push(booking);
      }

      // Process each billing cycle
      for (const [cycleKey, cycleBookings] of Object.entries(bookingsByCycle)) {
        const [cycleStart, cycleEnd] = cycleKey.split('_');
        console.log(`  Processing cycle ${new Date(cycleStart).toLocaleDateString()} - ${new Date(cycleEnd).toLocaleDateString()}`);
        
        // Sort bookings chronologically within cycle
        cycleBookings.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

        let tansUsedInCycle = 0;

        for (const booking of cycleBookings) {
          const expectedType = tansUsedInCycle < membership.monthlyTansIncluded ? 'included' : 'additional';
          const expectedAmount = expectedType === 'additional' ? membership.additionalTanPrice : 0;

          // Check if booking needs fixing
          if (booking.membershipType !== expectedType) {
            console.log(`    Fixing booking ${booking._id} on ${booking.date} ${booking.time}`);
            console.log(`      Was: ${booking.membershipType || 'not set'}, Should be: ${expectedType}`);
            
            // Update booking
            booking.membershipType = expectedType;
            booking.membershipChargeAmount = expectedAmount;
            await booking.save();
            
            // Fix or create MembershipUsage record if booking is confirmed or completed
            if (booking.status === 'confirmed' || booking.status === 'completed') {
              let usage = await MembershipUsage.findOne({
                bookingId: booking._id,
                status: 'used'
              });
              
              if (usage) {
                // Update existing usage
                if (usage.type !== expectedType) {
                  console.log(`      Updating existing usage record`);
                  usage.type = expectedType;
                  usage.amount = expectedAmount;
                  await usage.save();
                }
              } else if (booking.membershipUsageId) {
                // Try to find by ID
                usage = await MembershipUsage.findById(booking.membershipUsageId);
                if (usage && usage.type !== expectedType) {
                  console.log(`      Updating usage record by ID`);
                  usage.type = expectedType;
                  usage.amount = expectedAmount;
                  await usage.save();
                }
              } else {
                // Create missing usage record
                console.log(`      Creating missing usage record`);
                usage = await MembershipUsage.create({
                  membershipId: membership._id,
                  bookingId: booking._id,
                  userId: booking.userId,
                  usageDate: new Date(booking.date),
                  type: expectedType,
                  amount: expectedAmount,
                  status: 'used',
                  billingCycleStart: new Date(cycleStart),
                  billingCycleEnd: new Date(cycleEnd)
                });
                
                booking.membershipUsageId = usage._id;
                await booking.save();
              }
            }
            
            fixed++;
          } else {
            console.log(`    Booking ${booking._id} on ${booking.date} already correct (${booking.membershipType})`);
            alreadyCorrect++;
          }
          
          // Increment for all bookings (pending, confirmed, completed) to determine type
          // The type should be based on order of booking, not completion status
          tansUsedInCycle++;
        }
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Fixed: ${fixed} bookings`);
    console.log(`Already correct: ${alreadyCorrect} bookings`);
    console.log(`Errors: ${errors} bookings`);

    // Recalculate tansUsedThisMonth for all active memberships
    console.log('\nRecalculating current month usage for all active memberships...');
    const activeMemberships = await Membership.find({
      status: { $in: ['active', 'past_due'] }
    });

    for (const membership of activeMemberships) {
      const oldCount = membership.tansUsedThisMonth;
      await membership.recalculateTansUsed();
      console.log(`  Membership ${membership._id}: ${oldCount} -> ${membership.tansUsedThisMonth} tans used`);
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
fixMembershipTypes();