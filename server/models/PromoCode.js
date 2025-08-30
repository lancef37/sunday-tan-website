const mongoose = require('mongoose')

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageType: {
    type: String,
    enum: ['unlimited', 'total_limit', 'once_per_client'],
    default: 'unlimited'
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited usage (only applies when usageType is 'total_limit')
  },
  usageCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null // null means no expiration
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt field before saving
promoCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function() {
  const now = new Date()
  
  // Check if active
  if (!this.isActive) return false
  
  // Check if not expired
  if (this.validUntil && now > this.validUntil) return false
  
  // Check if usage limit exceeded (only for total_limit type)
  if (this.usageType === 'total_limit' && this.usageLimit && this.usageCount >= this.usageLimit) return false
  
  // Check if valid from date has passed
  if (this.validFrom && now < this.validFrom) return false
  
  return true
}

// Method to calculate discount amount
promoCodeSchema.methods.calculateDiscount = function(baseAmount) {
  if (!this.isValid()) return 0
  
  if (this.discountType === 'fixed') {
    return Math.min(this.discountValue, baseAmount)
  } else if (this.discountType === 'percentage') {
    return (baseAmount * this.discountValue) / 100
  }
  
  return 0
}

module.exports = mongoose.model('PromoCode', promoCodeSchema)