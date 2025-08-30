const mongoose = require('mongoose')

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referrerName: {
    type: String,
    required: true
  },
  referredPhone: {
    type: String,
    required: true,
    unique: true // Each phone can only be referred once ever
  },
  friendName: {
    type: String,
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['sent', 'scheduled', 'completed', 'used_for_membership', 'cancelled'],
    default: 'sent'
  },
  friendBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  friendMembershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    default: null
  },
  friendUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referrerRewardType: {
    type: String,
    enum: ['tan_discount', 'membership_discount', 'pending'],
    default: 'pending'
  },
  referrerRewardAmount: {
    type: Number,
    default: 10
  },
  referrerRewardCode: {
    type: String,
    default: null // Only for non-member tan discounts
  },
  rewardApplied: {
    type: Boolean,
    default: false
  },
  smsSentAt: {
    type: Date,
    default: Date.now
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Index for quick lookups
referralSchema.index({ referralCode: 1 })
referralSchema.index({ referrerId: 1 })
referralSchema.index({ status: 1 })
referralSchema.index({ referredPhone: 1 })

// Static method to check if phone has been referred
referralSchema.statics.hasPhoneBeenReferred = async function(phone) {
  const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '')
  const existing = await this.findOne({ 
    referredPhone: { $regex: cleanedPhone.replace(/^\+1/, ''), $options: 'i' }
  })
  return !!existing
}

// Static method to generate unique referral code
referralSchema.statics.generateUniqueCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  let isUnique = false
  
  while (!isUnique) {
    // Generate REF-XXXXXX format
    code = 'REF-'
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    
    // Check if code already exists
    const existing = await this.findOne({ referralCode: code })
    if (!existing) {
      isUnique = true
    }
  }
  
  return code
}

// Method to update status when friend schedules
referralSchema.methods.markAsScheduled = function(bookingId) {
  this.status = 'scheduled'
  this.scheduledAt = new Date()
  this.friendBookingId = bookingId
  return this.save()
}

// Method to mark as completed and determine reward type
referralSchema.methods.markAsCompleted = async function(isMember = false) {
  this.status = 'completed'
  this.completedAt = new Date()
  this.referrerRewardType = isMember ? 'membership_discount' : 'tan_discount'
  
  // If referrer is not a member, generate a tan discount code
  if (!isMember) {
    const PromoCode = require('./PromoCode')
    const rewardCode = `REWARD-${this.referralCode.substring(4)}`
    
    // Create a single-use promo code for the referrer
    await PromoCode.create({
      code: rewardCode,
      description: `Referral reward for referring ${this.friendName}`,
      discountType: 'fixed',
      discountValue: 10,
      isActive: true,
      usageLimit: 1,
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
    })
    
    this.referrerRewardCode = rewardCode
  }
  
  return this.save()
}

// Method to mark as used for membership
referralSchema.methods.markAsUsedForMembership = function(membershipId, userId) {
  this.status = 'used_for_membership'
  this.completedAt = new Date()
  this.friendMembershipId = membershipId
  this.friendUserId = userId
  return this.save()
}

// Method to cancel/revert referral
referralSchema.methods.cancelReferral = function() {
  if (this.status === 'scheduled') {
    this.status = 'cancelled'
    this.cancelledAt = new Date()
    this.friendBookingId = null
    return this.save()
  }
  return this
}

module.exports = mongoose.model('Referral', referralSchema)