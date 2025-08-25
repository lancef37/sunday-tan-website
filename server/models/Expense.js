const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    default: 'General'
  }
}, {
  timestamps: true
})

// Index for date-based queries
expenseSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Expense', expenseSchema)