const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
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
    default: null
  },
  clientName: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'waived'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  amount: {
    type: Number,
    default: 25
  },
  depositAmount: {
    type: Number,
    default: 10 // Default $10 deposit
  },
  finalAmount: {
    type: Number,
    default: null // Amount after applying promocode discounts
  },
  // Allows multiple promocodes to be stacked
  appliedPromoCodes: [{
    code: String,
    type: {
      type: String,
      enum: ['regular', 'referral'],
      required: true
    },
    discountAmount: Number,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Legacy field for backwards compatibility
  promoCode: {
    code: {
      type: String,
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0
    }
  },
  // Track total stacked discounts
  totalPromoDiscount: {
    type: Number,
    default: 0
  },
  // Referral tracking
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    default: null
  },
  additionalDiscount: {
    type: Number,
    default: 0 // Additional discount to apply at appointment time when stacking
  },
  appointmentRevenue: {
    type: Number,
    default: null // Amount collected at appointment time (excluding deposit)
  },
  actualRevenue: {
    type: Number,
    default: null // Total revenue (deposit + appointment revenue)
  },
  completedAt: {
    type: Date,
    default: null // When the appointment was marked as completed
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  smsConsent: {
    type: Boolean,
    default: false
  },
  // Cancellation fields
  cancellationToken: {
    type: String,
    unique: true,
    sparse: true // Only create index for non-null values
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    enum: ['client_request', 'admin_cancel', 'no_show', 'weather', 'other'],
    default: undefined
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed', 'not_applicable'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: null
  },
  refundId: {
    type: String,
    default: null // Square refund ID
  },
  // Membership fields
  membershipApplied: {
    type: Boolean,
    default: false
  },
  membershipType: {
    type: String,
    enum: ['included', 'additional'],
    default: undefined // undefined allows the field to be optional
  },
  membershipChargeAmount: {
    type: Number,
    default: null // 0 for included, 40 for additional
  },
  membershipUsageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipUsage',
    default: null
  },
  membershipPaymentRequired: {
    type: Boolean,
    default: false // True for additional tans that need payment
  },
  // Track membership status at time of booking creation
  membershipStatusAtBooking: {
    type: String,
    enum: ['member', 'non-member'],
    default: 'non-member'
  },
  // Tip amount (for tracking tips separately from service revenue)
  tipAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Indexes for performance
bookingSchema.index({ date: 1, time: 1 }, { unique: true })
bookingSchema.index({ status: 1, date: -1 }) // For admin queries
bookingSchema.index({ clientPhone: 1 }) // For client lookups
bookingSchema.index({ completedAt: -1 }) // For revenue reports
bookingSchema.index({ userId: 1, status: 1 }) // For user bookings

module.exports = mongoose.model('Booking', bookingSchema)