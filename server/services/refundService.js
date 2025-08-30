const squareService = require('./square');
const MembershipPayment = require('../models/MembershipPayment');

class RefundService {
  /**
   * Process a refund for a booking
   * @param {Object} booking - The booking to refund
   * @param {String} reason - Reason for the refund
   * @returns {Object} Refund result with status and details
   */
  async processBookingRefund(booking, reason) {
    console.log('\n=== REFUND SERVICE - PROCESSING BOOKING REFUND ===');
    console.log('Booking Details:', {
      bookingId: booking._id,
      clientName: booking.clientName,
      date: booking.date,
      time: booking.time,
      membershipApplied: booking.membershipApplied,
      membershipType: booking.membershipType,
      paymentId: booking.paymentId,
      paymentStatus: booking.paymentStatus,
      depositAmount: booking.depositAmount
    });
    
    const result = {
      success: false,
      refundStatus: 'none',
      refundAmount: 0,
      refundId: null,
      error: null
    };

    try {
      // Check if there's a payment to refund
      if (!booking.paymentId || booking.paymentStatus !== 'paid') {
        result.refundStatus = 'not_applicable';
        result.success = true;
        return result;
      }

      // Determine refund amount based on booking type
      let refundAmount = 0;
      
      if (booking.membershipApplied && booking.membershipType === 'additional') {
        // Member additional tan - refund $40
        refundAmount = 40;
        console.log('💰 MEMBER ADDITIONAL TAN REFUND TRIGGERED!');
        console.log('Refund Type: Member Additional Tan');
        console.log('Refund Amount: $40.00');
      } else if (!booking.membershipApplied) {
        // Non-member - refund deposit amount
        refundAmount = booking.depositAmount || 10;
        console.log('💰 NON-MEMBER DEPOSIT REFUND TRIGGERED!');
        console.log('Refund Type: Non-Member Deposit');
        console.log('Refund Amount: $' + refundAmount.toFixed(2));
      } else {
        // Member included tan - no refund needed
        console.log('ℹ️ Member included tan - no refund needed');
        console.log('=== END REFUND SERVICE ===\n');
        result.refundStatus = 'not_applicable';
        result.success = true;
        return result;
      }

      // Process Square refund
      console.log('Processing Square refund...');
      console.log('Payment ID to refund:', booking.paymentId);
      console.log('Amount in cents:', squareService.dollarsToCents(refundAmount));
      
      const refundResult = await squareService.refundPayment(
        booking.paymentId,
        { 
          amount: squareService.dollarsToCents(refundAmount), 
          currency: 'USD' 
        },
        reason || `Refund for ${booking.clientName} - ${booking.date} ${booking.time}`
      );

      if (refundResult.success) {
        console.log('✅ BOOKING REFUND SUCCESSFUL!');
        console.log('Refund ID:', refundResult.refundId);
        console.log('Refund Amount: $' + refundAmount.toFixed(2));
        result.success = true;
        result.refundStatus = 'processed';
        result.refundAmount = refundAmount;
        result.refundId = refundResult.refundId;
      } else {
        console.log('❌ BOOKING REFUND FAILED!');
        result.refundStatus = 'failed';
        result.error = 'Square refund failed';
      }
      console.log('=== END REFUND SERVICE ===\n');

    } catch (error) {
      console.error('❌ REFUND PROCESSING ERROR:', error);
      console.log('Error Message:', error.message);
      console.log('=== END REFUND SERVICE ===\n');
      result.refundStatus = 'failed';
      result.error = error.message;
    }

    return result;
  }

  /**
   * Process a refund for a membership payment
   * @param {String} membershipPaymentId - The MembershipPayment ID to refund
   * @param {String} reason - Reason for the refund
   * @returns {Object} Refund result
   */
  async processMembershipPaymentRefund(membershipPaymentId, reason) {
    const result = {
      success: false,
      refundStatus: 'none',
      refundAmount: 0,
      refundId: null,
      error: null
    };

    try {
      const payment = await MembershipPayment.findById(membershipPaymentId);
      
      if (!payment) {
        result.error = 'Payment not found';
        return result;
      }

      if (payment.status !== 'paid') {
        result.refundStatus = 'not_applicable';
        result.success = true;
        return result;
      }

      // Check if already refunded
      if (payment.status === 'refunded') {
        result.refundStatus = 'already_refunded';
        result.success = true;
        return result;
      }

      // Process Square refund if payment ID exists
      if (payment.squarePaymentId) {
        const refundResult = await squareService.refundPayment(
          payment.squarePaymentId,
          { 
            amount: squareService.dollarsToCents(payment.amount), 
            currency: 'USD' 
          },
          reason || 'Membership payment refund'
        );

        if (refundResult.success) {
          // Update payment record
          payment.status = 'refunded';
          payment.refundAmount = payment.amount;
          payment.refundDate = new Date();
          payment.refundedAt = new Date();
          payment.refundReason = reason;
          payment.squareRefundId = refundResult.refundId;
          await payment.save();

          result.success = true;
          result.refundStatus = 'processed';
          result.refundAmount = payment.amount;
          result.refundId = refundResult.refundId;
        } else {
          result.refundStatus = 'failed';
          result.error = 'Square refund failed';
        }
      } else {
        // No Square payment ID - mark as refunded internally
        payment.status = 'refunded';
        payment.refundAmount = payment.amount;
        payment.refundDate = new Date();
        payment.refundedAt = new Date();
        payment.refundReason = reason;
        await payment.save();

        result.success = true;
        result.refundStatus = 'processed';
        result.refundAmount = payment.amount;
      }

    } catch (error) {
      console.error('Membership payment refund error:', error);
      result.refundStatus = 'failed';
      result.error = error.message;
    }

    return result;
  }

  /**
   * Check if a booking is eligible for refund
   * @param {Object} booking - The booking to check
   * @returns {Object} Eligibility status and details
   */
  checkRefundEligibility(booking) {
    const now = new Date();
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hour, minute] = booking.time.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hour, minute);
    
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isTimeEligible = hoursUntilAppointment > 48;
    
    // Member additional tans are always refundable when cancelled
    const isMemberAdditional = booking.membershipApplied && booking.membershipType === 'additional';
    
    // Non-member deposits are refundable if >48 hours
    const isNonMemberEligible = !booking.membershipApplied && isTimeEligible;
    
    return {
      eligible: isMemberAdditional || isNonMemberEligible,
      hoursUntilAppointment,
      reason: isMemberAdditional 
        ? 'Member additional tan - always refundable'
        : isNonMemberEligible 
          ? 'Non-member deposit - more than 48 hours notice'
          : 'Not eligible for refund'
    };
  }
}

module.exports = new RefundService();