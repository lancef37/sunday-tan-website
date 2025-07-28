const express = require('express')
const router = express.Router()
const PromoCode = require('../models/PromoCode')

// Validate a promocode
router.post('/validate', async (req, res) => {
  try {
    const { code, amount } = req.body
    
    if (!code) {
      return res.status(400).json({ error: 'Promocode is required' })
    }
    
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    })
    
    if (!promoCode) {
      return res.status(404).json({ error: 'Invalid promocode' })
    }
    
    if (!promoCode.isValid()) {
      return res.status(400).json({ error: 'Promocode is expired or inactive' })
    }
    
    const discountAmount = promoCode.calculateDiscount(amount || 10)
    const finalAmount = Math.max(0, (amount || 10) - discountAmount)
    
    res.json({
      valid: true,
      code: promoCode.code,
      description: promoCode.description,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      promoCode: {
        id: promoCode._id,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue
      }
    })
  } catch (error) {
    console.error('Error validating promocode:', error)
    res.status(500).json({ error: 'Failed to validate promocode' })
  }
})

// Apply a promocode (increment usage count)
router.post('/apply', async (req, res) => {
  try {
    const { code } = req.body
    
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    })
    
    if (!promoCode || !promoCode.isValid()) {
      return res.status(400).json({ error: 'Invalid or expired promocode' })
    }
    
    // Increment usage count
    promoCode.usageCount += 1
    await promoCode.save()
    
    res.json({ 
      success: true, 
      message: 'Promocode applied successfully',
      usageCount: promoCode.usageCount 
    })
  } catch (error) {
    console.error('Error applying promocode:', error)
    res.status(500).json({ error: 'Failed to apply promocode' })
  }
})

module.exports = router