const express = require('express')
const router = express.Router()
const PromoCode = require('../models/PromoCode')
const PromoCodeUsage = require('../models/PromoCodeUsage')
const Referral = require('../models/Referral')

// Validate a promocode (supports both regular and referral codes)
router.post('/validate', async (req, res) => {
  try {
    const { code, amount, isReferral, appliedCodes = [], clientPhone } = req.body
    
    if (!code) {
      return res.status(400).json({ error: 'Promocode is required' })
    }
    
    const upperCode = code.toUpperCase()
    
    // Check if it's a referral code
    if (upperCode.startsWith('REF-')) {
      // Validate referral code
      const referral = await Referral.findOne({ referralCode: upperCode })
      
      if (!referral) {
        return res.status(404).json({ error: 'Invalid referral code' })
      }
      
      // Check referral status
      if (referral.status === 'scheduled') {
        return res.status(400).json({ error: 'This referral code has already been used for a booking' })
      }
      
      if (referral.status === 'completed') {
        return res.status(400).json({ error: 'This referral code has already been used and the appointment was completed' })
      }
      
      if (referral.status === 'used_for_membership') {
        return res.status(400).json({ error: 'This referral code has already been used for a membership signup' })
      }
      
      // For cancelled referrals, check if it's been more than 48 hours
      if (referral.status === 'cancelled') {
        const cancellationTime = referral.cancelledAt || referral.updatedAt
        const hoursSinceCancellation = (Date.now() - new Date(cancellationTime).getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceCancellation < 48) {
          return res.status(400).json({ 
            error: 'This referral code was recently cancelled. It can be used again after 48 hours.' 
          })
        }
        
        // Reset the referral to 'sent' status if it's been more than 48 hours
        referral.status = 'sent'
        referral.friendBookingId = null
        referral.cancelledAt = null
        await referral.save()
      }
      
      if (referral.status !== 'sent') {
        return res.status(400).json({ error: 'This referral code is not available for use' })
      }
      
      // Check if user already has applied codes
      const hasRegularPromo = appliedCodes.some(c => !c.toUpperCase().startsWith('REF-'))
      
      res.json({
        valid: true,
        code: referral.referralCode,
        type: 'referral',
        description: hasRegularPromo 
          ? 'Referral code applied! You\'ll receive an additional $10 off at your appointment.'
          : 'Referral code applied! Your deposit fee is waived.',
        discountAmount: hasRegularPromo ? 0 : 10, // If regular promo exists, discount applied at appointment
        finalAmount: hasRegularPromo ? 0 : Math.max(0, (amount || 10) - 10)
      })
    } else {
      // Regular promocode
      const promoCode = await PromoCode.findOne({ code: upperCode })
      
      if (!promoCode) {
        return res.status(404).json({ error: 'Invalid promocode' })
      }
      
      if (!promoCode.isValid()) {
        return res.status(400).json({ error: 'Promocode is expired or inactive' })
      }
      
      // Check if this is a once-per-client promocode
      if (promoCode.usageType === 'once_per_client' && clientPhone) {
        const existingUsage = await PromoCodeUsage.findOne({
          promoCodeId: promoCode._id,
          clientPhone: clientPhone
        })
        
        if (existingUsage) {
          return res.status(400).json({ error: 'You have already used this promocode' })
        }
      }
      
      const discountAmount = promoCode.calculateDiscount(amount || 10)
      const finalAmount = Math.max(0, (amount || 10) - discountAmount)
      
      res.json({
        valid: true,
        code: promoCode.code,
        type: 'regular',
        description: promoCode.description,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        promoCode: {
          id: promoCode._id,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue
        }
      })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate promocode' })
  }
})

// Apply a promocode (increment usage count and track client usage)
router.post('/apply', async (req, res) => {
  try {
    const { code, clientPhone, bookingId, discountAmount } = req.body
    
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    })
    
    if (!promoCode || !promoCode.isValid()) {
      return res.status(400).json({ error: 'Invalid or expired promocode' })
    }
    
    // Check if once-per-client and already used
    if (promoCode.usageType === 'once_per_client' && clientPhone) {
      const existingUsage = await PromoCodeUsage.findOne({
        promoCodeId: promoCode._id,
        clientPhone: clientPhone
      })
      
      if (existingUsage) {
        return res.status(400).json({ error: 'You have already used this promocode' })
      }
      
      // Record the usage
      const usage = new PromoCodeUsage({
        promoCodeId: promoCode._id,
        promoCode: promoCode.code,
        clientPhone: clientPhone,
        bookingId: bookingId || null,
        discountApplied: discountAmount || 0
      })
      await usage.save()
    }
    
    // Increment usage count (for all types)
    promoCode.usageCount += 1
    await promoCode.save()
    
    res.json({ 
      success: true, 
      message: 'Promocode applied successfully',
      usageCount: promoCode.usageCount 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply promocode' })
  }
})

module.exports = router