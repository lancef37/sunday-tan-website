const mongoose = require('mongoose');

const membershipPaymentSchema = new mongoose.Schema({
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['subscription', 'additional_tan', 'tip', 'refund', 'credit'],
    default: 'subscription'
  },
  description: {
    type: String,
    default: 'Monthly membership fee'
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  billingPeriodStart: {
    type: Date,
    required: true
  },
  billingPeriodEnd: {
    type: Date,
    required: true
  },
  squarePaymentId: {
    type: String,
    sparse: true
  },
  squareInvoiceId: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  failureReason: {
    type: String
  },
  refundAmount: {
    type: Number
  },
  refundDate: {
    type: Date
  },
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  // Track which booking and usage this payment is for
  bookingId: {
    type: String,
    sparse: true
  },
  usageId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
membershipPaymentSchema.index({ membershipId: 1, paymentDate: -1 });
membershipPaymentSchema.index({ userId: 1, paymentDate: -1 });
membershipPaymentSchema.index({ status: 1, paymentDate: -1 });
membershipPaymentSchema.index({ type: 1, paymentDate: -1 });
membershipPaymentSchema.index({ bookingId: 1 });

// Static method to get revenue for a date range
membershipPaymentSchema.statics.getRevenueForPeriod = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: { 
          $gte: startDate, 
          $lte: endDate 
        },
        status: 'paid'
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const revenue = {
    subscription: 0,
    additional_tan: 0,
    total: 0,
    payments: []
  };

  result.forEach(item => {
    // Include subscription, additional_tan, and tips in revenue
    if (item._id === 'subscription' || item._id === 'additional_tan' || item._id === 'tip') {
      revenue[item._id] = item.totalAmount;
    }
    revenue.payments.push({
      type: item._id,
      amount: item.totalAmount,
      count: item.count
    });
  });

  // Initialize tips if not present
  revenue.tip = revenue.tip || 0;
  
  revenue.total = revenue.subscription + revenue.additional_tan + revenue.tip;
  return revenue;
};

// Static method to get MRR (Monthly Recurring Revenue)
membershipPaymentSchema.statics.calculateMRR = async function() {
  const Membership = require('./Membership');
  
  const activeMemberships = await Membership.countDocuments({
    status: { $in: ['active', 'past_due'] }
  });
  
  // Assuming $105 per month per membership
  return activeMemberships * 105;
};

// Method to check if payment is for current billing period
membershipPaymentSchema.methods.isCurrentPeriod = function() {
  const now = new Date();
  return now >= this.billingPeriodStart && now <= this.billingPeriodEnd;
};

module.exports = mongoose.model('MembershipPayment', membershipPaymentSchema);