const mongoose = require('mongoose');

const membershipUsageSchema = new mongoose.Schema({
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageDate: {
    type: Date,
    required: true
  },
  bookingDate: {
    type: String,
    required: true
  },
  bookingTime: {
    type: String,
    required: true
  },
  sequenceNumber: {
    type: Number,
    required: true,
    default: 1
  },
  type: {
    type: String,
    enum: ['included', 'additional'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['used', 'refunded'],
    default: 'used'
  },
  refundedAt: {
    type: Date
  },
  refundReason: {
    type: String
  },
  billingCycleStart: {
    type: Date,
    required: true
  },
  billingCycleEnd: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

membershipUsageSchema.index({ membershipId: 1, status: 1 });
membershipUsageSchema.index({ bookingId: 1 });
membershipUsageSchema.index({ userId: 1, usageDate: -1 });

membershipUsageSchema.statics.createUsageRecord = async function(booking, membership) {
  // Count existing active usage records in this billing cycle for this user
  const existingUsageCount = await this.countDocuments({
    membershipId: membership._id,
    status: 'used',
    billingCycleStart: membership.billingCycleStart,
    billingCycleEnd: membership.billingCycleEnd
  });
  
  // Determine sequence number and type based on existing bookings
  const sequenceNumber = existingUsageCount + 1;
  const type = sequenceNumber <= membership.monthlyTansIncluded ? 'included' : 'additional';
  const amount = type === 'included' ? 0 : membership.additionalTanPrice;
  
  return this.create({
    membershipId: membership._id,
    bookingId: booking._id,
    userId: booking.userId,
    usageDate: new Date(),
    bookingDate: booking.date,
    bookingTime: booking.time,
    sequenceNumber,
    type,
    amount,
    status: 'used',
    billingCycleStart: membership.billingCycleStart,
    billingCycleEnd: membership.billingCycleEnd
  });
};

membershipUsageSchema.statics.refundUsage = async function(bookingId) {
  console.log('\n=== REFUND USAGE CALLED ===');
  console.log('Looking for usage record for booking:', bookingId);
  
  const usage = await this.findOne({ bookingId, status: 'used' });
  if (!usage) {
    console.log('No usage record found for this booking');
    console.log('=== END REFUND USAGE ===\n');
    return null;
  }
  
  console.log('Found usage record:', {
    usageId: usage._id,
    membershipId: usage.membershipId,
    type: usage.type,
    amount: usage.amount,
    sequenceNumber: usage.sequenceNumber
  });
  
  // Store membership ID before refunding
  const membershipId = usage.membershipId;
  
  usage.status = 'refunded';
  usage.refundedAt = new Date();
  usage.refundReason = 'Booking cancelled or status changed';
  await usage.save();
  
  console.log('Usage record marked as refunded');
  console.log('Triggering billing cycle recalculation...');
  
  // Trigger recalculation of the billing cycle
  const recalcResult = await this.recalculateBillingCycle(membershipId);
  
  // Add refund info to the usage object
  usage.recalculationRefundProcessed = recalcResult?.refundProcessed || false;
  
  console.log('=== END REFUND USAGE ===\n');
  return usage;
};

membershipUsageSchema.statics.getUsageForBillingCycle = async function(membershipId, cycleStart, cycleEnd) {
  return this.find({
    membershipId,
    status: 'used',
    billingCycleStart: { $gte: cycleStart },
    billingCycleEnd: { $lte: cycleEnd }
  }).populate('bookingId');
};

// Recalculate all usage records for a billing cycle after cancellation
membershipUsageSchema.statics.recalculateBillingCycle = async function(membershipId) {
  console.log('\n=== MEMBERSHIP RECALCULATION TRIGGERED ===');
  console.log('Membership ID:', membershipId);
  
  const Membership = mongoose.model('Membership');
  const Booking = mongoose.model('Booking');
  const MembershipPayment = mongoose.model('MembershipPayment');
  
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    console.log('Membership not found!');
    console.log('=== END RECALCULATION ===\n');
    return;
  }
  
  console.log('Membership details:', {
    userId: membership.userId,
    monthlyTansIncluded: membership.monthlyTansIncluded,
    tansUsedThisMonth: membership.tansUsedThisMonth,
    billingCycleStart: membership.billingCycleStart,
    billingCycleEnd: membership.billingCycleEnd
  });
  
  // Get all active (non-refunded) usage records for this billing cycle
  const activeUsages = await this.find({
    membershipId: membership._id,
    status: 'used',
    billingCycleStart: membership.billingCycleStart,
    billingCycleEnd: membership.billingCycleEnd
  }).populate('bookingId').sort('bookingDate bookingTime');
  
  console.log('Active usage records found:', activeUsages.length);
  console.log('Current usage types:', activeUsages.map(u => ({
    sequence: u.sequenceNumber,
    type: u.type,
    amount: u.amount,
    bookingId: u.bookingId?._id
  })));
  
  let updatePromises = [];
  let paymentUpdates = [];
  let refundProcessed = false; // Track if we've already processed a refund for this recalculation
  
  // Re-sequence and re-type all active usage records
  console.log('\n--- RE-SEQUENCING USAGE RECORDS ---');
  for (let i = 0; i < activeUsages.length; i++) {
    const usage = activeUsages[i];
    const newSequenceNumber = i + 1;
    const newType = newSequenceNumber <= membership.monthlyTansIncluded ? 'included' : 'additional';
    const newAmount = newType === 'included' ? 0 : membership.additionalTanPrice;
    
    console.log(`Usage ${i+1}:`, {
      oldSequence: usage.sequenceNumber,
      newSequence: newSequenceNumber,
      oldType: usage.type,
      newType: newType,
      oldAmount: usage.amount,
      newAmount: newAmount,
      bookingId: usage.bookingId?._id
    });
    
    // Check if type changed
    if (usage.type !== newType || usage.sequenceNumber !== newSequenceNumber) {
      const oldType = usage.type;
      const oldAmount = usage.amount;
      
      console.log(`🔄 CHANGE DETECTED for booking ${usage.bookingId?._id}:`);
      console.log(`  - Sequence: ${usage.sequenceNumber} -> ${newSequenceNumber}`);
      console.log(`  - Type: ${oldType} -> ${newType}`);
      console.log(`  - Amount: $${oldAmount} -> $${newAmount}`);
      
      // Update usage record
      usage.sequenceNumber = newSequenceNumber;
      usage.type = newType;
      usage.amount = newAmount;
      updatePromises.push(usage.save());
      
      // Update associated booking
      if (usage.bookingId) {
        const booking = usage.bookingId;
        booking.membershipType = newType;
        booking.membershipChargeAmount = newAmount;
        updatePromises.push(booking.save());
        
        // Handle payment changes - LIMIT TO ONE REFUND PER RECALCULATION
        if (oldType === 'additional' && newType === 'included' && !refundProcessed) {
          console.log(`\n💰 TAN BECAME FREE - PROCESSING $40 REFUND!`);
          console.log(`Tan for booking ${booking._id} changed from additional to included - processing refund`)
          // Was paid, now free - process Square refund
          const payment = await MembershipPayment.findOne({
            bookingId: booking._id.toString(),
            type: 'additional_tan',
            status: 'paid'
          });
          
          if (payment) {
            console.log(`Found payment record for booking ${booking._id} - processing $40 refund`)
            // Process Square refund if payment was made through Square
            // Use the payment's squarePaymentId first, fall back to booking.paymentId
            const paymentIdToRefund = payment.squarePaymentId || booking.paymentId;
            
            if (paymentIdToRefund) {
              try {
                const squareService = require('../services/square');
                const refundResult = await squareService.refundPayment(
                  paymentIdToRefund,
                  { 
                    amount: squareService.dollarsToCents(40), // $40 additional tan fee
                    currency: 'USD' 
                  },
                  `Membership recalculation refund - tan became included after cancellation`
                );
                
                if (refundResult.success) {
                  payment.squareRefundId = refundResult.refundId;
                  payment.refundAmount = 40;
                  payment.refundDate = new Date();
                }
              } catch (error) {
                console.error('Failed to process Square refund during recalculation:', error);
                // Continue with marking as refunded even if Square refund fails
              }
            }
            
            payment.status = 'refunded';
            payment.refundedAt = new Date();
            payment.refundReason = 'Tan became included after recalculation';
            paymentUpdates.push(payment.save());
            
            // Mark that we've processed a refund for this recalculation
            refundProcessed = true;
            console.log('✅ Refund processed - no more refunds will be issued for this recalculation');
          }
        } else if (oldType === 'additional' && newType === 'included' && refundProcessed) {
          // Log that we're skipping additional refunds
          console.log(`\n⚠️ SKIPPING REFUND for booking ${booking._id} - already processed one refund for this cancellation`);
        } else if (oldType === 'included' && newType === 'additional') {
          // Was free, now needs payment - create new payment record
          const existingPayment = await MembershipPayment.findOne({
            bookingId: booking._id.toString(),
            type: 'additional_tan'
          });
          
          if (!existingPayment) {
            const newPayment = new MembershipPayment({
              membershipId: membership._id,
              userId: booking.userId,
              bookingId: booking._id.toString(),
              amount: membership.additionalTanPrice,
              type: 'additional_tan',
              status: 'pending',
              description: `Additional tan charge for ${booking.date} at ${booking.time} (after recalculation)`
            });
            paymentUpdates.push(newPayment.save());
          }
        }
      }
    }
  }
  
  // Update membership tan count based on active usage
  membership.tansUsedThisMonth = activeUsages.length;
  updatePromises.push(membership.save());
  
  console.log('\n--- RECALCULATION SUMMARY ---');
  console.log('Total active tans:', activeUsages.length);
  console.log('Updates to process:', updatePromises.length);
  console.log('Payment updates:', paymentUpdates.length);
  
  // Execute all updates
  await Promise.all([...updatePromises, ...paymentUpdates]);
  
  console.log('✅ RECALCULATION COMPLETE!');
  console.log('=== END MEMBERSHIP RECALCULATION ===\n');
  
  return {
    recalculatedCount: activeUsages.length,
    membership,
    refundProcessed: refundProcessed // Return whether a refund was processed
  };
};

module.exports = mongoose.model('MembershipUsage', membershipUsageSchema);