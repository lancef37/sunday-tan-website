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
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Client', clientSchema)