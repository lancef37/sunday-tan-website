const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const User = require('../models/User')
const MembershipUsage = require('../models/MembershipUsage')
const Membership = require('../models/Membership')
const { sendSMS, sendBookingNotification, sendPendingBookingSMS, sendConfirmationSMS, sendDenialSMS } = require('../services/sms')
const { createPayment } = require('../services/payment')
const squareService = require('../services/square')
const { authenticateUser } = require('./userAuth')
const { validateDate, validateTimeSlot, sanitizeInput } = require('../utils/validation')

router.post('/', authenticateUser, async (req, res) => {
  try {
    const { date, time, smsConsent, promoCode } = req.body
    
    // Get user details from authenticated user
    const clientName = req.user.name
    const clientPhone = req.user.phone
    const clientEmail = req.user.email
    const userId = req.user._id

    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' })
    }

    // Validate date format and ensure it's not in the past
    if (!validateDate(date)) {
      return res.status(400).json({ error: 'Invalid date or date is in the past' })
    }

    // Validate time format
    if (!validateTimeSlot(time)) {
      return res.status(400).json({ error: 'Invalid time format' })
    }

    // Validate SMS consent
    if (!smsConsent) {
      return res.status(400).json({ error: 'SMS consent is required' })
    }

    // Check for existing booking
    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }

    // Check if user has active membership at time of booking
    const membership = await Membership.findActiveByUserId(userId)
    const membershipStatus = membership ? 'member' : 'non-member'

    // Create booking
    const booking = new Booking({
      date,
      time,
      userId,
      clientName,
      clientPhone,
      clientEmail,
      smsConsent,
      promoCode: promoCode ? { code: promoCode, discountAmount: 0 } : null,
      membershipStatusAtBooking: membershipStatus
    })

    await booking.save()

    // Handle client record
    let client = await Client.findOne({ userId: userId })
    if (!client) {
      // Check if there's an existing client with same phone (legacy data)
      client = await Client.findOne({ phone: clientPhone })
      if (client) {
        // Link existing client to user
        client.userId = userId
        await client.save()
      } else {
        // Create new client
        client = new Client({
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          userId: userId
        })
        await client.save()
      }
    }

    // Update client appointments
    client.appointments.push({
      date,
      bookingId: booking._id
    })
    client.totalAppointments += 1
    // Don't set lastVisit here - it should only be set when appointment is completed
    await client.save()
    
    // Check and mark referral as scheduled if applicable
    if (promoCode?.code) {
      try {
        const Referral = require('../models/Referral')
        const referral = await Referral.findOne({ referralCode: promoCode.code })
        if (referral && referral.status === 'sent') {
          await referral.markAsScheduled(booking._id)
        }
      } catch (referralError) {
        // Continue even if referral update fails
      }
    }

    // Send SMS notifications
    try {
      // Send admin notification
      await sendBookingNotification(process.env.ADMIN_PHONE, booking)
      
      // Send client pending notification
      await sendPendingBookingSMS(clientPhone, booking)
    } catch (smsError) {
      // Continue processing even if SMS fails
    }

    res.status(201).json({
      booking,
      message: 'Booking request submitted successfully! Please wait for confirmation.'
    })

  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking', details: error.message })
  }
})

// Get user's bookings
router.get('/my-bookings', authenticateUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ date: -1, time: -1 })
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// Admin route to get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ date: 1, time: 1 })
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentId, status } = req.body
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        paymentStatus: status,
        paymentId: paymentId,
        status: 'pending' // Always default to pending, admin will confirm manually
      },
      { new: true }
    )
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    res.json(booking)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment' })
  }
})

// Client cancellation endpoint
router.post('/cancel/:id', authenticateUser, async (req, res) => {
  try {
    console.log('Cancel request received for booking:', req.params.id)
    console.log('User ID from auth:', req.user?._id)
    const { confirmCancel } = req.body
    const bookingId = req.params.id
    const userId = req.user._id
    
    if (!confirmCancel) {
      return res.status(400).json({ error: 'Cancellation confirmation required' })
    }
    
    // Find booking and ensure it belongs to the user
    const booking = await Booking.findOne({ 
      _id: bookingId,
      userId: userId,
      status: { $in: ['pending', 'confirmed'] }
    })
    
    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found or cannot be cancelled' 
      })
    }
    
    // Calculate refund details
    const getHoursUntilAppointment = (date, time) => {
      // Date is in YYYY-MM-DD format
      const appointmentDateTime = new Date(`${date}T${time}:00`);
      const now = new Date();
      
      console.log('\n=== BOOKING CANCELLATION DATE CHECK ===');
      console.log('Booking date string:', date);
      console.log('Booking time string:', time);
      console.log('Parsed appointment date:', appointmentDateTime.toLocaleString());
      console.log('Current date:', now.toLocaleString());
      
      const diffMs = appointmentDateTime.getTime() - now.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      
      console.log('Hours until appointment:', hours);
      console.log('Is eligible for refund (>48 hours)?:', hours > 48);
      console.log('=== END DATE CHECK ===\n');
      
      return hours;
    }
    
    const hoursUntilAppointment = getHoursUntilAppointment(booking.date, booking.time)
    const isRefundEligible = hoursUntilAppointment > 48
    const hasPayment = !!(booking.paymentStatus === 'paid' && booking.paymentId)
    
    let refundResult = null
    let refundStatus = 'none'
    let refundAmount = 0
    
    // Handle membership bookings
    if (booking.membershipApplied) {
      console.log('Processing membership booking cancellation')
      console.log('Booking membership type:', booking.membershipType)
      console.log('Booking payment status:', booking.paymentStatus)
      console.log('Booking payment ID:', booking.paymentId)
      
      try {
        // Check if this is an additional tan that needs a direct refund
        if (booking.membershipType === 'additional' && booking.paymentId && booking.paymentStatus === 'paid') {
          console.log('\n=== MEMBER ADDITIONAL TAN CANCELLATION REFUND ===');
          console.log('Processing $40 refund for cancelled additional tan');
          console.log('Booking ID:', booking._id);
          console.log('Payment ID:', booking.paymentId);
          
          try {
            // Process the $40 refund through Square
            const refundResult = await squareService.refundPayment(
              booking.paymentId,
              { 
                amount: squareService.dollarsToCents(40), 
                currency: 'USD' 
              },
              `Member additional tan cancellation refund for ${booking.clientName} - ${booking.date} ${booking.time}`
            );
            
            if (refundResult.success) {
              console.log('✅ MEMBER ADDITIONAL TAN REFUND SUCCESSFUL!');
              console.log('Refund ID:', refundResult.refundId);
              refundStatus = 'processed';
              refundAmount = 40;
              
              // Update the MembershipPayment record if it exists
              const MembershipPayment = require('../models/MembershipPayment');
              const payment = await MembershipPayment.findOne({
                bookingId: booking._id.toString(),
                type: 'additional_tan',
                status: 'paid'
              });
              
              if (payment) {
                payment.status = 'refunded';
                payment.refundAmount = 40;
                payment.refundDate = new Date();
                payment.refundedAt = new Date();
                payment.refundReason = 'Booking cancelled';
                payment.squareRefundId = refundResult.refundId;
                await payment.save();
                console.log('MembershipPayment record updated to refunded');
              }
            } else {
              console.log('❌ MEMBER ADDITIONAL TAN REFUND FAILED!');
              refundStatus = 'failed';
            }
            console.log('=== END MEMBER ADDITIONAL TAN CANCELLATION REFUND ===\n');
          } catch (refundError) {
            console.error('Error processing additional tan refund:', refundError);
            refundStatus = 'failed';
          }
        }
        
        // Only process if there's a usage record to refund
        if (booking.membershipUsageId) {
          console.log('Refunding membership usage for booking:', booking._id)
          // Refund the membership tan usage - this will trigger recalculation
          const refundedUsage = await MembershipUsage.refundUsage(booking._id)
          
          if (refundedUsage) {
            // The recalculateBillingCycle method will:
            // 1. Re-sequence all remaining bookings
            // 2. Change any 'additional' tans to 'included' if they moved into the first 2 slots
            // 3. Process $40 refunds for any tans that changed from 'additional' to 'included'
            
            // Check if the recalculation triggered any refunds
            const recalculationRefundProcessed = refundedUsage.recalculationRefundProcessed;
            
            // Only set refund status if we haven't already processed a direct refund
            if (refundStatus === 'none') {
              if (refundedUsage.type === 'additional') {
                // Additional tan - should have been refunded above
                refundStatus = refundAmount > 0 ? 'processed' : 'not_applicable';
              } else if (refundedUsage.type === 'included' && recalculationRefundProcessed) {
                // Included tan cancellation triggered a refund for another booking
                refundStatus = 'processed';
                refundAmount = 40; // Standard additional tan refund amount
                console.log('✅ Member included tan cancellation triggered $40 refund via reordering');
              } else {
                refundStatus = 'not_applicable'; // Included tan - no refund triggered
              }
            }
          }
        }
      } catch (membershipError) {
        console.error('Error processing membership cancellation:', membershipError)
        // Continue with cancellation even if membership refund fails
      }
      
      // Don't clear membership fields - we need them for display purposes
      // The booking is already cancelled and the usage was refunded
      // Keeping these fields helps the UI show the correct status
    }
    // Handle non-membership bookings with deposits
    else if (isRefundEligible && hasPayment && !booking.membershipApplied) {
      try {
        const depositAmount = booking.depositAmount || 10
        refundResult = await squareService.refundPayment(
          booking.paymentId,
          { amount: squareService.dollarsToCents(depositAmount), currency: 'USD' },
          `Client cancellation refund for ${booking.clientName} - ${booking.date} ${booking.time}`
        )
        
        if (refundResult.success) {
          refundStatus = 'processed'
          refundAmount = depositAmount
        } else {
          refundStatus = 'failed'
        }
      } catch (refundError) {
        refundStatus = 'failed'
      }
    } else if (isRefundEligible && !hasPayment) {
      // Promocode booking - no refund needed
      refundStatus = 'not_applicable'
    } else if (!isRefundEligible && hasPayment && !booking.membershipApplied) {
      // Cancellation within 48 hours - no refund
      refundStatus = 'not_applicable'
    }
    
    // Update booking status
    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancellationReason = 'client_request'
    booking.refundStatus = refundStatus
    booking.refundAmount = refundAmount > 0 ? refundAmount : null
    booking.refundId = refundResult?.refundId || null
    
    // Revert referral if applicable
    try {
      const referralService = require('../services/referralService')
      await referralService.revertReferral(booking._id)
    } catch (referralError) {
      // Continue even if referral reversion fails
    }
    
    await booking.save()
    
    // Log the booking data after cancellation
    console.log('Cancelled booking data:', {
      id: booking._id,
      status: booking.status,
      refundStatus: booking.refundStatus,
      refundAmount: booking.refundAmount,
      membershipApplied: booking.membershipApplied,
      isMemberBooking: booking.isMemberBooking,
      membershipType: booking.membershipType
    });
    
    // Send admin notification
    try {
      const adminPhone = process.env.ADMIN_PHONE
      if (adminPhone) {
        const message = `🚫 CLIENT CANCELLATION
        
📅 ${booking.date} at ${booking.time}
👤 ${booking.clientName} (${booking.clientPhone})
⏰ ${Math.round(hoursUntilAppointment)} hours in advance
💰 Refund: ${refundStatus === 'processed' ? `$${refundAmount} refunded` : 
            refundStatus === 'not_applicable' ? 'N/A (member/promo)' : 
            'None (within 48hrs)'}

Slot now available.`
        
        await sendSMS(adminPhone, message)
      }
    } catch (smsError) {
    }
    
    // Send client confirmation
    try {
      let refundText = ''
      
      if (booking.membershipApplied) {
        refundText = booking.membershipType === 'included' ? 
          'Your included membership tan has been released for rebooking this month.' :
          'Your $40 additional tan charge will be refunded.'
      } else if (refundStatus === 'processed') {
        refundText = `Your $${refundAmount} deposit will be refunded in 3-5 business days.`
      } else if (refundStatus === 'not_applicable') {
        refundText = 'No refund needed (promocode booking).'
      } else {
        refundText = 'Per our policy, deposits within 48 hours are non-refundable.'
      }
      
      const message = `✨ Sunday Tan - Cancellation Confirmed

📅 ${booking.date} at ${booking.time}
${refundText}

Thank you for choosing Sunday Tan!`
      
      // Check if user has opted in for SMS
      const user = await User.findById(req.userId)
      const userOptIn = user?.smsOptIn ?? true // Default to true for backward compatibility
      await sendSMS(booking.clientPhone, message, true, userOptIn)
    } catch (smsError) {
    }
    
    // Update client record
    try {
      const client = await Client.findOne({ userId: userId })
      if (client) {
        client.cancelledAppointments = (client.cancelledAppointments || 0) + 1
        await client.save()
      }
    } catch (clientError) {
    }
    
    res.json({
      success: true,
      message: booking.membershipApplied ? 
        'Appointment cancelled. Your membership tan has been released.' :
        isRefundEligible && hasPayment ? 
          'Appointment cancelled. Your deposit will be refunded in 3-5 business days.' : 
          'Appointment cancelled successfully.',
      refundStatus,
      refundAmount,
      hoursUntilAppointment: Math.round(hoursUntilAppointment)
    })
    
  } catch (error) {
    console.error('Client cancellation error:', error)
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      details: error.message 
    })
  }
})

module.exports = router