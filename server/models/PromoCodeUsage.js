const mongoose = require('mongoose')

const promoCodeUsageSchema = new mongoose.Schema({
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
    required: true
  },
  promoCode: {
    type: String,
    required: true,
    uppercase: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  discountApplied: {
    type: Number,
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
})

// Compound index to ensure a client can only use a promo code once
promoCodeUsageSchema.index({ promoCodeId: 1, clientPhone: 1 }, { unique: true })
promoCodeUsageSchema.index({ promoCode: 1, clientPhone: 1 })

module.exports = mongoose.model('PromoCodeUsage', promoCodeUsageSchema)