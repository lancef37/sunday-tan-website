const express = require('express')
const router = express.Router()
const squareService = require('../services/square')
const Booking = require('../models/Booking')
const PromoCode = require('../models/PromoCode')

// Process payment for booking deposit (without creating booking yet)
router.post('/process-deposit', async (req, res) => {
  try {
    const { 
      sourceId, 
      amount,
      promoCode 
    } = req.body

    if (!sourceId) {
      return res.status(400).json({ error: 'Payment source is required' })
    }

    // Calculate final amount after promocode
    let finalAmount = amount || 10
    let promoCodeData = null

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() })
      if (promo && promo.isValid()) {
        const discount = promo.calculateDiscount(finalAmount)
        finalAmount = Math.max(0, finalAmount - discount)
        
        promoCodeData = {
          code: promo.code,
          discountAmount: discount
        }

        // Increment usage count
        promo.usageCount += 1
        await promo.save()
      }
    }

    // If final amount is 0 (free with promocode), return success without processing
    if (finalAmount === 0) {
      return res.json({
        success: true,
        message: 'Deposit waived by promocode',
        paymentId: 'promo-free-deposit',
        amount: finalAmount,
        promoCodeData: promoCodeData
      })
    }

    // Process payment through Square
    const paymentRequest = {
      sourceId: sourceId,
      amountMoney: {
        amount: squareService.dollarsToCents(finalAmount),
        currency: 'USD'
      },
      note: `Sunday Tan Deposit`,
      idempotencyKey: squareService.generateIdempotencyKey(`deposit-${Date.now()}`)
    }

    console.log('Processing payment, Amount:', finalAmount)

    const paymentResult = await squareService.createPayment(paymentRequest)

    if (paymentResult.success) {
      console.log('Payment successful:', paymentResult.paymentId)

      res.json({
        success: true,
        message: 'Payment processed successfully',
        paymentId: paymentResult.paymentId,
        amount: finalAmount,
        receiptUrl: paymentResult.receiptUrl,
        promoCodeData: promoCodeData
      })
    } else {
      res.status(400).json({
        error: 'Payment processing failed',
        details: paymentResult
      })
    }

  } catch (error) {
    console.error('Payment processing error:', error)
    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message
    })
  }
})

// Refund a payment
router.post('/refund', async (req, res) => {
  try {
    const { bookingId, reason } = req.body

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' })
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (!booking.paymentId || booking.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'No payment to refund for this booking' })
    }

    const refundAmount = booking.finalAmount || booking.depositAmount || 10

    const refundResult = await squareService.refundPayment(
      booking.paymentId,
      {
        amount: squareService.dollarsToCents(refundAmount),
        currency: 'USD'
      },
      reason || 'Booking cancellation'
    )

    if (refundResult.success) {
      // Update booking status
      booking.paymentStatus = 'refunded'
      booking.status = 'cancelled'
      await booking.save()

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: refundResult.refundId,
        amount: refundAmount
      })
    } else {
      res.status(400).json({
        error: 'Refund processing failed',
        details: refundResult
      })
    }

  } catch (error) {
    console.error('Refund processing error:', error)
    res.status(500).json({
      error: 'Refund processing failed',
      message: error.message
    })
  }
})

// Get payment status
router.get('/status/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    res.json({
      bookingId: booking._id,
      paymentStatus: booking.paymentStatus,
      paymentId: booking.paymentId,
      amount: booking.finalAmount || booking.depositAmount,
      promoCode: booking.promoCode
    })

  } catch (error) {
    console.error('Error fetching payment status:', error)
    res.status(500).json({ error: 'Failed to fetch payment status' })
  }
})

module.exports = router