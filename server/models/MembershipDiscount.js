const mongoose = require('mongoose')

const membershipDiscountSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['referral', 'promotion', 'admin_adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'applied', 'lost'],
    default: 'pending'
  },
  referralIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  }],
  scheduledForDate: {
    type: Date,
    required: true
  },
  appliedDate: {
    type: Date,
    default: null
  },
  lostDate: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  billingPeriod: {
    start: Date,
    end: Date
  }
}, {
  timestamps: true
})

// Index for quick lookups
membershipDiscountSchema.index({ membershipId: 1, status: 1 })
membershipDiscountSchema.index({ userId: 1, status: 1 })
membershipDiscountSchema.index({ scheduledForDate: 1 })

// Static method to calculate total pending discount for a user (max $100)
membershipDiscountSchema.statics.calculatePendingDiscount = async function(userId) {
  const pendingDiscounts = await this.find({
    userId,
    status: 'pending',
    type: 'referral'
  })
  
  const total = pendingDiscounts.reduce((sum, discount) => sum + discount.amount, 0)
  return Math.min(total, 100) // Max $100 per billing cycle
}

// Static method to get pending discounts for a membership
membershipDiscountSchema.statics.getPendingDiscounts = async function(membershipId) {
  return await this.find({
    membershipId,
    status: 'pending'
  }).populate('referralIds')
}

// Static method to add referral discount (stackable)
membershipDiscountSchema.statics.addReferralDiscount = async function(userId, membershipId, referralId, nextBillingDate) {
  // Check current pending amount
  const currentPending = await this.calculatePendingDiscount(userId)
  
  if (currentPending >= 100) {
    throw new Error('Maximum referral discount of $100 already reached for this billing cycle')
  }
  
  // Check if we have an existing pending referral discount we can add to
  let discount = await this.findOne({
    membershipId,
    status: 'pending',
    type: 'referral',
    scheduledForDate: nextBillingDate
  })
  
  if (discount) {
    // Add to existing discount (up to max)
    const newAmount = Math.min(discount.amount + 10, 100)
    const actualIncrease = newAmount - discount.amount
    
    discount.amount = newAmount
    discount.referralIds.push(referralId)
    discount.description = `Referral rewards (${discount.referralIds.length} referrals)`
    await discount.save()
    
    return { discount, amountAdded: actualIncrease }
  } else {
    // Create new discount
    discount = await this.create({
      membershipId,
      userId,
      type: 'referral',
      amount: 10,
      status: 'pending',
      referralIds: [referralId],
      scheduledForDate: nextBillingDate,
      description: 'Referral reward (1 referral)'
    })
    
    return { discount, amountAdded: 10 }
  }
}

// Method to apply discount during billing
membershipDiscountSchema.methods.applyDiscount = function() {
  this.status = 'applied'
  this.appliedDate = new Date()
  return this.save()
}

// Method to mark discount as lost (membership cancelled)
membershipDiscountSchema.methods.markAsLost = function() {
  this.status = 'lost'
  this.lostDate = new Date()
  return this.save()
}

// Static method to handle membership cancellation
membershipDiscountSchema.statics.handleMembershipCancellation = async function(membershipId) {
  const pendingDiscounts = await this.find({
    membershipId,
    status: 'pending'
  })
  
  for (const discount of pendingDiscounts) {
    await discount.markAsLost()
  }
  
  return pendingDiscounts.length
}

module.exports = mongoose.model('MembershipDiscount', membershipDiscountSchema)