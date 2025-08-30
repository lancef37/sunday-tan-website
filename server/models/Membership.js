const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  billingCycleStart: {
    type: Date,
    required: true
  },
  billingCycleEnd: {
    type: Date,
    required: true
  },
  squareSubscriptionId: {
    type: String,
    sparse: true
  },
  squareCustomerId: {
    type: String,
    sparse: true
  },
  tansUsedThisMonth: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyTansIncluded: {
    type: Number,
    default: 2
  },
  additionalTanPrice: {
    type: Number,
    default: 40
  },
  monthlyPrice: {
    type: Number,
    default: 105
  },
  productDiscountPercent: {
    type: Number,
    default: 10
  },
  cancellationDate: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  // Stacked promocode tracking for initial signup
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
  totalSignupDiscount: {
    type: Number,
    default: 0 // Total discount applied at signup (stacked promocodes)
  },
  // Referral discount tracking
  pendingReferralDiscounts: [{
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral'
    },
    amount: {
      type: Number,
      default: 10
    }
  }],
  nextBillingDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  referralDiscountsApplied: [{
    date: Date,
    amount: Number,
    referralIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral'
    }]
  }]
}, {
  timestamps: true
});

membershipSchema.methods.getRemainingTans = function() {
  return Math.max(0, this.monthlyTansIncluded - this.tansUsedThisMonth);
};

membershipSchema.methods.needsAdditionalPayment = function() {
  return this.tansUsedThisMonth >= this.monthlyTansIncluded;
};

membershipSchema.methods.calculateTanPrice = function() {
  if (this.tansUsedThisMonth < this.monthlyTansIncluded) {
    return 0;
  }
  return this.additionalTanPrice;
};

membershipSchema.methods.resetMonthlyUsage = function() {
  this.tansUsedThisMonth = 0;
  const now = new Date();
  this.billingCycleStart = new Date(now);
  this.billingCycleEnd = new Date(now.setMonth(now.getMonth() + 1));
  this.nextBillingDate = this.billingCycleEnd;
  return this.save();
};

// Recalculate tans used based on actual usage records
membershipSchema.methods.recalculateTansUsed = async function() {
  const MembershipUsage = require('./MembershipUsage');
  
  // Count active (non-refunded) usage records in current billing cycle
  const activeUsageCount = await MembershipUsage.countDocuments({
    membershipId: this._id,
    status: 'used',
    billingCycleStart: this.billingCycleStart,
    billingCycleEnd: this.billingCycleEnd
  });
  
  this.tansUsedThisMonth = activeUsageCount;
  return this.save();
};

membershipSchema.statics.findActiveByUserId = async function(userId) {
  return this.findOne({ 
    userId, 
    status: 'active'
  });
};

module.exports = mongoose.model('Membership', membershipSchema);