const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const squareService = require('../services/square')
const { sendSMS } = require('../services/sms')
const { v4: uuidv4 } = require('uuid')

// Generate cancellation token for a booking
async function generateCancellationToken(bookingId) {
  const token = uuidv4()
  await Booking.findByIdAndUpdate(bookingId, { cancellationToken: token })
  return token
}

// Calculate hours between now and appointment
function getHoursUntilAppointment(date, time) {
  // Parse the date string properly - date is in YYYY-MM-DD format
  // Add timezone to ensure local time interpretation
  const appointmentDateTime = new Date(`${date}T${time}:00`)
  const now = new Date()
  
  // Debug logging
  console.log('\n=== DATE CALCULATION DEBUG ===');
  console.log('Input date:', date);
  console.log('Input time:', time);
  console.log('Appointment DateTime:', appointmentDateTime.toLocaleString());
  console.log('Current DateTime:', now.toLocaleString());
  console.log('Appointment timestamp:', appointmentDateTime.getTime());
  console.log('Current timestamp:', now.getTime());
  
  const diffMs = appointmentDateTime.getTime() - now.getTime()
  const hours = diffMs / (1000 * 60 * 60)
  
  console.log('Difference in ms:', diffMs);
  console.log('Difference in hours:', hours);
  console.log('Is refundable (>48 hours)?:', hours > 48);
  console.log('=== END DATE CALCULATION DEBUG ===\n');
  
  return hours // Convert to hours
}

// GET /cancel/:token - Cancellation page
router.get('/cancel/:token', async (req, res) => {
  try {
    const { token } = req.params
    
    // Find booking by cancellation token
    const booking = await Booking.findOne({ 
      cancellationToken: token,
      status: { $in: ['pending', 'confirmed'] } // Only allow cancelling active bookings
    })
    
    if (!booking) {
      return res.status(404).json({ 
        error: 'Invalid or expired cancellation link' 
      })
    }
    
    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'This booking has already been cancelled' 
      })
    }
    
    // Calculate refund eligibility
    const hoursUntilAppointment = getHoursUntilAppointment(booking.date, booking.time)
    const isRefundEligible = hoursUntilAppointment > 48
    const hasPayment = !!(booking.paymentStatus === 'paid' && booking.paymentId)
    
    // Return booking details for confirmation page
    res.json({
      booking: {
        id: booking._id,
        date: booking.date,
        time: booking.time,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10,
        isRefundEligible,
        hasPayment,
        depositAmount: booking.depositAmount || 10,
        refundAmount: isRefundEligible && hasPayment ? (booking.depositAmount || 10) : 0
      }
    })
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /cancel/:token - Process cancellation
router.post('/cancel/:token', async (req, res) => {
  try {
    const { token } = req.params
    const { confirmCancel } = req.body
    
    if (!confirmCancel) {
      return res.status(400).json({ error: 'Cancellation confirmation required' })
    }
    
    // Find booking by cancellation token
    const booking = await Booking.findOne({ 
      cancellationToken: token,
      status: { $in: ['pending', 'confirmed'] }
    })
    
    if (!booking) {
      return res.status(404).json({ 
        error: 'Invalid or expired cancellation link' 
      })
    }
    
    // Calculate refund details
    const hoursUntilAppointment = getHoursUntilAppointment(booking.date, booking.time)
    const isRefundEligible = hoursUntilAppointment > 48
    const hasPayment = !!(booking.paymentStatus === 'paid' && booking.paymentId)
    
    let refundResult = null
    let refundStatus = 'none'
    let refundAmount = 0
    
    // Process refund if eligible and payment exists
    if (isRefundEligible && hasPayment) {
      console.log('\n=== CANCELLATION REFUND TRIGGERED ===');
      console.log('Booking Cancellation Details:', {
        bookingId: booking._id,
        clientName: booking.clientName,
        date: booking.date,
        time: booking.time,
        hoursUntilAppointment: Math.round(hoursUntilAppointment),
        paymentId: booking.paymentId,
        depositAmount: booking.depositAmount || 10
      });
      console.log('Refund Eligible: YES (>48 hours notice)');
      
      try {
        const depositAmount = booking.depositAmount || 10
        console.log('Processing deposit refund: $' + depositAmount.toFixed(2));
        
        refundResult = await squareService.refundPayment(
          booking.paymentId,
          { amount: squareService.dollarsToCents(depositAmount), currency: 'USD' },
          `Cancellation refund for ${booking.clientName} - ${booking.date} ${booking.time}`
        )
        
        if (refundResult.success) {
          refundStatus = 'processed'
          refundAmount = depositAmount
          console.log('✅ CANCELLATION DEPOSIT REFUND SUCCESSFUL!');
          console.log('Refund Status: processed');
          console.log('Refund Amount: $' + depositAmount.toFixed(2));
          console.log('=== END CANCELLATION REFUND ===\n');
        } else {
          refundStatus = 'failed'
          console.log('❌ CANCELLATION DEPOSIT REFUND FAILED!');
          console.log('=== END CANCELLATION REFUND ===\n');
        }
      } catch (refundError) {
        refundStatus = 'failed'
        console.log('❌ CANCELLATION REFUND ERROR:', refundError.message);
        console.log('=== END CANCELLATION REFUND ===\n');
      }
    } else if (isRefundEligible && !hasPayment) {
      // Promocode booking - no refund needed
      console.log('\n=== CANCELLATION REFUND CHECK ===');
      console.log('Promocode booking - no payment to refund');
      console.log('=== END CANCELLATION REFUND CHECK ===\n');
      refundStatus = 'not_applicable'
    } else if (!isRefundEligible) {
      console.log('\n=== CANCELLATION REFUND CHECK ===');
      console.log('Not eligible for refund (less than 48 hours notice)');
      console.log('Hours until appointment:', Math.round(hoursUntilAppointment));
      console.log('=== END CANCELLATION REFUND CHECK ===\n');
    }
    
    // Update booking status
    const updateData = {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'client_request',
      refundStatus,
      refundAmount: refundAmount > 0 ? refundAmount : null,
      refundId: refundResult?.refundId || null,
      cancellationToken: `used_${Date.now()}` // Mark token as used
    }
    
    await Booking.findByIdAndUpdate(booking._id, updateData)
    
    // Send admin notification
    try {
      const adminPhone = process.env.ADMIN_PHONE
      if (adminPhone) {
        await sendCancellationAdminSMS(adminPhone, booking, {
          hoursUntilAppointment,
          refundStatus,
          refundAmount
        })
      }
    } catch (smsError) {
      // Don't fail the cancellation if SMS fails
    }
    
    // Send client confirmation
    try {
      await sendCancellationConfirmationSMS(booking.clientPhone, booking, {
        refundStatus,
        refundAmount,
        isRefundEligible
      })
    } catch (smsError) {
    }
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundStatus,
      refundAmount,
      isRefundEligible,
      hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10
    })
    
  } catch (error) {
    res.status(500).json({ error: 'Server error during cancellation', details: error.message })
  }
})

// Helper function to send admin cancellation SMS
async function sendCancellationAdminSMS(adminPhone, booking, details) {
  const refundText = details.refundStatus === 'processed' 
    ? `💰 Refund: $${details.refundAmount.toFixed(2)} processed via Square`
    : details.refundStatus === 'not_applicable'
    ? `💰 Refund: Not applicable (promocode booking)`
    : details.refundStatus === 'failed'
    ? `💰 Refund: FAILED - Manual processing required`
    : `💰 Refund: None (within 48 hours)`
  
  const message = `🚫 CANCELLATION ALERT

📅 ${booking.date} at ${booking.time}
👤 ${booking.clientName} (${booking.clientPhone})
⏰ Cancelled: ${Math.round(details.hoursUntilAppointment)} hours in advance
${refundText}
📋 Status: Completed

Slot now available for rebooking.`

  return await sendSMS(adminPhone, message)
}

// Helper function to send client cancellation confirmation SMS
async function sendCancellationConfirmationSMS(clientPhone, booking, details) {
  let refundText = ''
  
  if (details.refundStatus === 'processed') {
    refundText = `💰 Your $${details.refundAmount.toFixed(2)} deposit has been refunded and will appear in your account within 3-5 business days.`
  } else if (details.refundStatus === 'not_applicable') {
    refundText = `💰 No refund needed since no deposit was charged for your promocode booking.`
  } else if (details.refundStatus === 'failed') {
    refundText = `💰 There was an issue processing your refund. We'll contact you within 24 hours to resolve this.`
  } else {
    refundText = `💰 Per our cancellation policy, deposits are non-refundable within 48 hours of the appointment.`
  }
  
  const message = `✨ Sunday Tan - Cancellation Confirmed ✨

Your appointment has been cancelled:
📅 ${booking.date} at ${booking.time}

${refundText}

Thank you for choosing Sunday Tan. We hope to see you again soon!

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message)
}

module.exports = { router, generateCancellationToken }