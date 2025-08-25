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
    enum: ['pending', 'paid', 'failed'],
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
  actualRevenue: {
    type: Number,
    default: null // Only set when appointment is marked as completed
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
  }
}, {
  timestamps: true
})

bookingSchema.index({ date: 1, time: 1 }, { unique: true })

module.exports = mongoose.model('Booking', bookingSchema)