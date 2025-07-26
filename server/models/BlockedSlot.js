const mongoose = require('mongoose')

const blockedSlotSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'Unavailable'
  },
  createdBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
})

blockedSlotSchema.index({ date: 1, time: 1 }, { unique: true })

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema)