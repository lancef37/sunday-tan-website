const mongoose = require('mongoose')

const tempReservationSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  bookingData: {
    clientName: String,
    clientPhone: String,
    clientEmail: String,
    smsConsent: Boolean,
    promoCode: {
      code: String,
      discountAmount: Number
    },
    finalAmount: Number,
    depositAmount: Number
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60000), // 15 minutes from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index - auto-delete after expiry
  }
}, {
  timestamps: true
})

// Compound index for checking slot availability
tempReservationSchema.index({ date: 1, time: 1 })

module.exports = mongoose.model('TempReservation', tempReservationSchema)