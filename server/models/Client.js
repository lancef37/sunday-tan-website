const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  appointments: [{
    date: {
      type: String,
      required: true
    },
    notes: {
      type: String
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  }],
  totalAppointments: {
    type: Number,
    default: 0
  },
  lastVisit: {
    type: Date
  },
  smsOptIn: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Indexes for performance
clientSchema.index({ phone: 1 }) // Already unique from schema
clientSchema.index({ email: 1 })
clientSchema.index({ totalAppointments: -1 }) // For top clients
clientSchema.index({ lastVisit: -1 })

module.exports = mongoose.model('Client', clientSchema)