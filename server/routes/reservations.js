const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const TempReservation = require('../models/TempReservation')
const Membership = require('../models/Membership')
const { authenticateUser } = require('./userAuth')
const { sendBookingNotification, sendPendingBookingSMS } = require('../services/sms')

// Create a temporary reservation (replaces immediate booking creation)
router.post('/reserve', authenticateUser, async (req, res) => {
  try {
    
    const { 
      date, 
      time, 
      smsConsent, 
      promoCode, // Legacy single code
      appliedPromoCodes = [], // New array of stacked codes
      totalPromoDiscount = 0,
      additionalDiscount = 0, // Additional discount to apply at appointment time
      finalAmount, 
      depositAmount 
    } = req.body
    const userId = req.user._id
    
    
    // Check for active membership and calculate pricing
    let membershipPricing = null
    const membership = await Membership.findActiveByUserId(userId)
    if (membership) {
      // Count ALL member bookings to properly calculate pricing
      const MembershipUsage = require('../models/MembershipUsage')
      
      // Count ALL MembershipUsage records (both pending and confirmed bookings now have usage records)
      const approvedUsageCount = await MembershipUsage.countDocuments({
        membershipId: membership._id,
        status: 'used', // Only count non-refunded usage
        billingCycleStart: membership.billingCycleStart,
        billingCycleEnd: membership.billingCycleEnd
      })
      
      // No need to count pending bookings separately anymore since they have usage records
      // This prevents double-counting
      const pendingMemberBookingsCount = 0
      
      // 3. Count active temporary reservations (not yet converted to bookings)
      const activeReservationsCount = await TempReservation.countDocuments({
        userId: userId,
        expiresAt: { $gt: new Date() },
        date: {
          $gte: membership.billingCycleStart.toISOString().split('T')[0],
          $lte: membership.billingCycleEnd.toISOString().split('T')[0]
        }
      })
      
      // Calculate total tans that will be used (including this booking)
      // approvedUsageCount now includes ALL bookings (pending, confirmed, completed) with usage records
      const totalExistingBookings = approvedUsageCount + activeReservationsCount
      const totalTansToBeUsed = totalExistingBookings + 1
      
      console.log('Tan counting for new reservation:', {
        approvedUsageCount,
        activeReservationsCount,
        totalExistingBookings,
        totalTansToBeUsed,
        monthlyTansIncluded: membership.monthlyTansIncluded
      })
      
      // Calculate price for this booking based on total usage
      let tanPrice = 0
      let membershipType = 'included'
      let depositRequired = false
      let paymentRequired = false
      
      if (totalTansToBeUsed <= membership.monthlyTansIncluded) {
        // This will be an included tan - no payment needed
        tanPrice = 0
        membershipType = 'included'
        depositRequired = false
        paymentRequired = false
      } else {
        // This will be an additional tan - $40 payment required
        console.log('\n=== MEMBER ADDITIONAL TAN RESERVATION ===');
        console.log('Member has used all included tans');
        console.log('Additional tan price: $' + membership.additionalTanPrice);
        console.log('Payment required: YES');
        console.log('=== END MEMBER ADDITIONAL TAN RESERVATION ===\n');
        tanPrice = membership.additionalTanPrice
        membershipType = 'additional'
        depositRequired = false // Still no deposit
        paymentRequired = true // But need to pay $40
      }
      
      membershipPricing = {
        hasMembership: true,
        tansUsedThisMonth: membership.tansUsedThisMonth,
        activeUsageCount: approvedUsageCount,
        pendingBookingsCount: pendingMemberBookingsCount,
        activeReservationsCount: activeReservationsCount,
        totalTansToBeUsed: totalTansToBeUsed, // Already includes this booking
        tansIncluded: membership.monthlyTansIncluded,
        tansRemaining: Math.max(0, membership.monthlyTansIncluded - totalTansToBeUsed),
        tanPrice,
        membershipType,
        depositRequired,
        paymentRequired
      }
    }
    
    // Check if slot is available (not booked or reserved)
    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }
    
    // Check for existing reservations (excluding expired ones)
    const existingReservation = await TempReservation.findOne({
      date,
      time,
      expiresAt: { $gt: new Date() }
    })
    
    if (existingReservation && existingReservation.userId.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Time slot is currently reserved by another user' })
    }
    
    // Cancel any existing reservation by this user for this slot
    if (existingReservation && existingReservation.userId.toString() === userId.toString()) {
      await TempReservation.deleteOne({ _id: existingReservation._id })
    }
    
    // Create session ID for this reservation
    const sessionId = crypto.randomBytes(32).toString('hex')
    
    // Create temporary reservation
    const reservation = new TempReservation({
      date,
      time,
      userId,
      sessionId,
      bookingData: {
        clientName: req.user.name,
        clientPhone: req.user.phone,
        clientEmail: req.user.email,
        smsConsent,
        promoCode: promoCode ? { code: promoCode, discountAmount: totalPromoDiscount } : null, // Legacy
        appliedPromoCodes, // New stacked codes
        totalPromoDiscount,
        additionalDiscount, // Track additional discount for appointment time
        finalAmount,
        depositAmount,
        membershipPricing // Store membership pricing info in reservation
      }
    })
    
    await reservation.save()
    
    res.json({
      success: true,
      sessionId,
      expiresAt: reservation.expiresAt,
      membershipPricing,
      message: 'Time slot reserved for 15 minutes'
    })
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to reserve time slot',
      details: error.message 
    })
  }
})

// Complete booking (after payment or promo code confirmation)
router.post('/complete', authenticateUser, async (req, res) => {
  try {
    const { sessionId, paymentId, paymentStatus } = req.body
    const userId = req.user._id
    
    // Find the reservation
    const reservation = await TempReservation.findOne({
      sessionId,
      userId,
      expiresAt: { $gt: new Date() }
    })
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found or expired' })
    }
    
    // Check one more time that the slot hasn't been booked
    const existingBooking = await Booking.findOne({
      date: reservation.date,
      time: reservation.time
    })
    
    if (existingBooking) {
      // Clean up the reservation
      await TempReservation.deleteOne({ _id: reservation._id })
      return res.status(400).json({ error: 'Time slot was booked by another user' })
    }
    
    // Determine payment status based on the payment flow
    let determinedPaymentStatus = 'pending'
    if (paymentStatus) {
      determinedPaymentStatus = paymentStatus
    } else if (reservation.bookingData.finalAmount === 0) {
      // No payment needed (member included tan or promocode waived)
      determinedPaymentStatus = 'waived'
    } else if (paymentId) {
      // Payment was processed
      determinedPaymentStatus = 'paid'
    }
    
    // Create the actual booking
    const bookingData = {
      date: reservation.date,
      time: reservation.time,
      userId,
      clientName: reservation.bookingData.clientName,
      clientPhone: reservation.bookingData.clientPhone,
      clientEmail: reservation.bookingData.clientEmail,
      smsConsent: reservation.bookingData.smsConsent,
      finalAmount: reservation.bookingData.finalAmount,
      depositAmount: reservation.bookingData.depositAmount,
      paymentId,
      paymentStatus: determinedPaymentStatus,
      status: 'pending', // Always default to pending, admin will confirm manually
      cancellationToken: uuidv4() // Generate unique cancellation token
    }
    
    // Add stacked promocode information
    if (reservation.bookingData.appliedPromoCodes && reservation.bookingData.appliedPromoCodes.length > 0) {
      bookingData.appliedPromoCodes = reservation.bookingData.appliedPromoCodes
      bookingData.totalPromoDiscount = reservation.bookingData.totalPromoDiscount || 0
      bookingData.additionalDiscount = reservation.bookingData.additionalDiscount || 0
      
      // Check for referral code and link it
      const referralCode = reservation.bookingData.appliedPromoCodes.find(pc => pc.type === 'referral')
      if (referralCode) {
        const Referral = require('../models/Referral')
        const referral = await Referral.findOne({ referralCode: referralCode.code })
        if (referral && referral.status === 'sent') {
          bookingData.referralId = referral._id
          // Note: We'll mark referral as scheduled after booking is created
        }
      }
    }
    
    // Legacy promoCode field for backwards compatibility
    if (reservation.bookingData.promoCode && reservation.bookingData.promoCode.code) {
      bookingData.promoCode = reservation.bookingData.promoCode
      
      // Also check legacy promoCode for referral codes
      if (reservation.bookingData.promoCode.code.startsWith('REF-')) {
        const Referral = require('../models/Referral')
        const referral = await Referral.findOne({ referralCode: reservation.bookingData.promoCode.code })
        if (referral && referral.status === 'sent') {
          bookingData.referralId = referral._id
          // Note: We'll mark referral as scheduled after booking is created
        }
      }
    }
    
    // Add membership information if applicable
    if (reservation.bookingData.membershipPricing && reservation.bookingData.membershipPricing.hasMembership) {
      bookingData.membershipApplied = true
      // Always set membershipType from the reservation calculation
      bookingData.membershipType = reservation.bookingData.membershipPricing.membershipType || 'included'
      bookingData.membershipChargeAmount = reservation.bookingData.membershipPricing.tanPrice || 0
      bookingData.membershipStatusAtBooking = 'member'
      // Note: membershipUsageId will be set when booking status changes to 'completed'
    } else {
      bookingData.membershipStatusAtBooking = 'non-member'
    }
    
    const booking = new Booking(bookingData)
    
    await booking.save()
    
    // Create MembershipUsage record for membership bookings
    // Note: We create usage records for pending bookings too, so recalculation works when they're cancelled
    if (booking.membershipApplied && booking.membershipStatusAtBooking === 'member') {
      const Membership = require('../models/Membership')
      const MembershipUsage = require('../models/MembershipUsage')
      
      const membership = await Membership.findActiveByUserId(userId)
      if (membership) {
        // Create usage record - it will determine the type and sequence
        console.log('Creating MembershipUsage record for booking:', booking._id);
        const usage = await MembershipUsage.createUsageRecord(booking, membership)
        console.log('Created usage record:', {
          usageId: usage._id,
          type: usage.type,
          sequenceNumber: usage.sequenceNumber,
          amount: usage.amount
        })
        
        // Update booking with correct membership info from usage record
        booking.membershipUsageId = usage._id
        booking.membershipType = usage.type
        booking.membershipChargeAmount = usage.amount
        await booking.save()
        
        // Update membership tan count
        await membership.recalculateTansUsed()
        
        // Create MembershipPayment record for additional tan charges
        if (usage.type === 'additional' && usage.amount > 0) {
          console.log('\n=== MEMBER ADDITIONAL TAN $40 PAYMENT TRIGGERED ===');
          console.log('Creating MembershipPayment for additional tan');
          console.log('Booking Details:', {
            bookingId: booking._id,
            clientName: booking.clientName,
            date: booking.date,
            time: booking.time,
            membershipType: usage.type,
            amount: usage.amount
          });
          
          const MembershipPayment = require('../models/MembershipPayment')
          
          // Check if payment was already processed (member paid $40)
          const paymentStatus = booking.paymentId && booking.paymentStatus === 'paid' 
            ? 'paid' 
            : 'pending';
          
          console.log('Payment Details:', {
            amount: '$' + usage.amount.toFixed(2),
            paymentStatus: paymentStatus,
            squarePaymentId: booking.paymentId || 'none',
            membershipId: membership._id,
            userId: booking.userId
          });
          
          const payment = new MembershipPayment({
            membershipId: membership._id,
            userId: booking.userId,
            amount: usage.amount,
            type: 'additional_tan',
            description: `Additional tan for booking on ${booking.date}`,
            paymentDate: new Date(),
            billingPeriodStart: membership.billingCycleStart,
            billingPeriodEnd: membership.billingCycleEnd,
            status: paymentStatus,
            squarePaymentId: booking.paymentId || null, // Link Square payment ID
            bookingId: booking._id.toString(),
            usageId: usage._id.toString()
          })
          
          await payment.save()
          console.log('✅ MEMBER ADDITIONAL TAN PAYMENT RECORD CREATED!');
          console.log('MembershipPayment ID:', payment._id);
          console.log('=== END MEMBER ADDITIONAL TAN PAYMENT ===\n');
        }
      }
    }
    
    // Mark referral as scheduled if a referral code was used
    if (bookingData.referralId) {
      const Referral = require('../models/Referral')
      const referral = await Referral.findById(bookingData.referralId)
      if (referral && referral.status === 'sent') {
        await referral.markAsScheduled(booking._id)
      }
    }
    
    // Update client record
    let client = await Client.findOne({ userId })
    if (client) {
      client.appointments.push({
        date: reservation.date,
        bookingId: booking._id
      })
      client.totalAppointments += 1
      // Don't set lastVisit here - it should only be set when appointment is completed
      await client.save()
    }
    
    // Send notifications
    try {
      // Send admin notification if admin phone is configured
      if (process.env.ADMIN_PHONE) {
        await sendBookingNotification(process.env.ADMIN_PHONE, booking)
      } else {
      }
      
      // Send client notification
      if (reservation.bookingData.clientPhone) {
        await sendPendingBookingSMS(reservation.bookingData.clientPhone, booking)
      }
    } catch (smsError) {
    }
    
    // Delete the temporary reservation
    await TempReservation.deleteOne({ _id: reservation._id })
    
    res.json({
      success: true,
      booking,
      message: 'Booking confirmed successfully!'
    })
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete booking' })
  }
})

// Cancel/release a reservation
router.post('/cancel', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.body
    const userId = req.user._id
    
    const result = await TempReservation.deleteOne({
      sessionId,
      userId
    })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Reservation not found' })
    }
    
    res.json({ success: true, message: 'Reservation cancelled' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel reservation' })
  }
})

// Check if a slot is available (considers both bookings and active reservations)
router.get('/check-availability/:date/:time', async (req, res) => {
  try {
    const { date, time } = req.params
    
    // Check for existing booking
    const booking = await Booking.findOne({ date, time })
    if (booking) {
      return res.json({ available: false, reason: 'Already booked' })
    }
    
    // Check for active reservation
    const reservation = await TempReservation.findOne({
      date,
      time,
      expiresAt: { $gt: new Date() }
    })
    
    if (reservation) {
      return res.json({ 
        available: false, 
        reason: 'Currently reserved',
        expiresAt: reservation.expiresAt
      })
    }
    
    res.json({ available: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check availability' })
  }
})

module.exports = router