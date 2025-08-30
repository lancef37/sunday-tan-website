const Referral = require('../models/Referral')
const MembershipDiscount = require('../models/MembershipDiscount')
const Membership = require('../models/Membership')
const User = require('../models/User')
const PromoCode = require('../models/PromoCode')
const smsService = require('./sms')

class ReferralService {
  /**
   * Check if a phone number belongs to an existing client
   */
  async isExistingClient(phoneNumber) {
    const Client = require('../models/Client')
    const Booking = require('../models/Booking')
    
    try {
      // Clean the phone number for consistent checking
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber)
      
      // Check if there's a User account with this phone
      const existingUser = await User.findOne({ 
        phone: { $regex: cleanedPhone, $options: 'i' } 
      })
      
      if (existingUser) {
        // Check if they have any completed bookings
        const completedBooking = await Booking.findOne({
          userId: existingUser._id,
          status: 'completed'
        })
        
        if (completedBooking) {
          return true
        }
      }
      
      // Check Client collection for this phone number with completed appointments
      const existingClient = await Client.findOne({ 
        phone: { $regex: cleanedPhone, $options: 'i' }
      })
      
      if (existingClient && existingClient.totalAppointments > 0) {
        return true
      }
      
      // Check for any completed bookings with this phone number (legacy bookings without user account)
      const completedBookingByPhone = await Booking.findOne({
        clientPhone: { $regex: cleanedPhone, $options: 'i' },
        status: 'completed'
      })
      
      if (completedBookingByPhone) {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error checking existing client status:', error)
      return false
    }
  }
  
  /**
   * Create and send a referral
   */
  async createAndSendReferral(referrerId, friendPhone, friendName) {
    try {
      // Clean phone number
      const cleanedPhone = this.cleanPhoneNumber(friendPhone)
      
      // Check if this person is already an existing client
      const isClient = await this.isExistingClient(cleanedPhone)
      if (isClient) {
        throw new Error('Your friend is already a valued client!')
      }
      
      // Check if phone has already been referred
      const alreadyReferred = await Referral.hasPhoneBeenReferred(cleanedPhone)
      if (alreadyReferred) {
        throw new Error('Your friend has already been referred!')
      }
      
      // Get referrer details
      const referrer = await User.findById(referrerId)
      if (!referrer) {
        throw new Error('Referrer not found')
      }
      
      // Generate unique referral code
      const referralCode = await Referral.generateUniqueCode()
      
      // Create referral record
      const referral = await Referral.create({
        referrerId,
        referrerName: referrer.name,
        referredPhone: cleanedPhone,
        friendName,
        referralCode,
        status: 'sent'
      })
      
      // Create corresponding promocode for friend to use
      await PromoCode.create({
        code: referralCode,
        description: `Referral code from ${referrer.name} for ${friendName}`,
        discountType: 'fixed',
        discountValue: 10,
        isActive: true,
        usageLimit: 1,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
      
      // Send SMS to friend
      const message = `${referrer.name} loves their Sunday Tan glow! They've sent you a special gift - use code ${referralCode} for $10 off your first spray tan or membership. Book at sundaytan.com ✨`
      
      await smsService.sendSMS(cleanedPhone, message)
      
      return {
        success: true,
        referralCode,
        referral
      }
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Mark referral as scheduled when friend books
   */
  async markAsScheduled(referralCode, bookingId) {
    try {
      const referral = await Referral.findOne({ referralCode })
      if (!referral) {
        return null
      }
      
      if (referral.status !== 'sent') {
        return referral
      }
      
      await referral.markAsScheduled(bookingId)
      
      return referral
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Process referral completion when appointment is completed
   */
  async processCompletion(bookingId) {
    try {
      // First get the booking to check if it has a referralId
      const Booking = require('../models/Booking')
      const booking = await Booking.findById(bookingId)
      
      let referral = null
      
      // Try to find referral by booking's referralId first (more reliable)
      if (booking && booking.referralId) {
        referral = await Referral.findById(booking.referralId)
      }
      
      // Fallback to finding by friendBookingId
      if (!referral) {
        referral = await Referral.findOne({ friendBookingId: bookingId })
      }
      
      if (!referral) {
        return null
      }
      
      if (referral.status !== 'scheduled') {
        return null
      }
      
      // Check if referrer is a member
      const membership = await Membership.findOne({
        userId: referral.referrerId,
        status: { $in: ['active', 'past_due'] }
      })
      
      const isMember = !!membership
      
      // Mark referral as completed and determine reward type
      await referral.markAsCompleted(isMember)
      
      // Handle reward based on membership status
      if (isMember && membership) {
        // Add to pending membership discounts
        const result = await MembershipDiscount.addReferralDiscount(
          referral.referrerId,
          membership._id,
          referral._id,
          membership.nextBillingDate
        )
        
        // Update membership's next billing discount
        const totalPending = await MembershipDiscount.calculatePendingDiscount(referral.referrerId)
        membership.nextBillingDiscount = totalPending
        await membership.save()
        
        // Send SMS to member
        const message = `Amazing! Your referral was successful. You've earned $10 off your next membership bill (Total pending: $${totalPending}, max $100). Applied automatically at renewal! 🎉`
        const referrer = await User.findById(referral.referrerId)
        if (referrer && referrer.phone) {
          await smsService.sendSMS(referrer.phone, message)
        }
        
      } else {
        // Send SMS with tan discount code to non-member
        const referrer = await User.findById(referral.referrerId)
        if (referrer && referrer.phone && referral.referrerRewardCode) {
          const message = `Great news! Your friend completed their appointment. Here's your reward code ${referral.referrerRewardCode} for $10 off your next tan. Thank you for spreading the glow! 🌟`
          await smsService.sendSMS(referrer.phone, message)
        }
        
      }
      
      referral.rewardApplied = true
      await referral.save()
      
      return referral
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Process referral for membership signup
   */
  async processForMembership(referralCode, membershipId, userId) {
    try {
      const referral = await Referral.findOne({ referralCode })
      if (!referral) {
        return null
      }
      
      if (referral.status !== 'sent' && referral.status !== 'scheduled') {
        return null
      }
      
      // Mark as used for membership
      await referral.markAsUsedForMembership(membershipId, userId)
      
      // Process reward for referrer (same as completion)
      const membership = await Membership.findOne({
        userId: referral.referrerId,
        status: { $in: ['active', 'past_due'] }
      })
      
      if (membership) {
        // Add membership discount
        const result = await MembershipDiscount.addReferralDiscount(
          referral.referrerId,
          membership._id,
          referral._id,
          membership.nextBillingDate
        )
        
        const totalPending = await MembershipDiscount.calculatePendingDiscount(referral.referrerId)
        membership.nextBillingDiscount = totalPending
        await membership.save()
        
        // Send SMS
        const message = `Amazing! Your friend just joined as a member using your referral! You've earned $10 off your next membership bill (Total pending: $${totalPending}, max $100). 🎉`
        const referrer = await User.findById(referral.referrerId)
        if (referrer && referrer.phone) {
          await smsService.sendSMS(referrer.phone, message)
        }
      } else {
        // Create tan discount for non-member
        await referral.markAsCompleted(false)
        
        const referrer = await User.findById(referral.referrerId)
        if (referrer && referrer.phone && referral.referrerRewardCode) {
          const message = `Awesome! Your friend joined as a member! Here's your reward code ${referral.referrerRewardCode} for $10 off your next tan. Consider joining too for even more benefits! ⭐`
          await smsService.sendSMS(referrer.phone, message)
        }
      }
      
      referral.rewardApplied = true
      await referral.save()
      
      return referral
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Revert referral if booking is cancelled
   */
  async revertReferral(bookingId) {
    try {
      const referral = await Referral.findOne({ friendBookingId: bookingId })
      if (!referral) {
        return null
      }
      
      if (referral.status === 'completed' || referral.rewardApplied) {
        return null
      }
      
      await referral.cancelReferral()
      
      return referral
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Get user's referral history
   */
  async getUserReferrals(userId) {
    try {
      const referrals = await Referral.find({ referrerId: userId })
        .sort({ createdAt: -1 })
        .lean()
      
      return referrals
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Calculate pending discount for a user
   */
  async calculatePendingDiscount(userId) {
    try {
      const pendingAmount = await MembershipDiscount.calculatePendingDiscount(userId)
      
      // Count pending referrals
      const pendingReferrals = await Referral.countDocuments({
        referrerId: userId,
        status: 'completed',
        referrerRewardType: 'membership_discount',
        rewardApplied: true
      })
      
      return {
        pendingAmount: Math.min(pendingAmount, 100),
        referralCount: pendingReferrals,
        maxDiscount: 100
      }
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Apply membership discounts during billing
   */
  async applyMembershipDiscounts(membershipId, billingAmount) {
    try {
      const discounts = await MembershipDiscount.getPendingDiscounts(membershipId)
      
      let totalDiscount = 0
      const appliedDiscounts = []
      
      for (const discount of discounts) {
        if (totalDiscount >= 100) break // Max $100 discount
        
        const applyAmount = Math.min(discount.amount, 100 - totalDiscount)
        totalDiscount += applyAmount
        
        await discount.applyDiscount()
        appliedDiscounts.push(discount)
      }
      
      const finalAmount = Math.max(0, billingAmount - totalDiscount)
      
      return {
        originalAmount: billingAmount,
        discountAmount: totalDiscount,
        finalAmount,
        appliedDiscounts
      }
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Handle membership cancellation - lose pending discounts
   */
  async handleMembershipCancellation(membershipId) {
    try {
      const lostCount = await MembershipDiscount.handleMembershipCancellation(membershipId)
      return lostCount
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Clean phone number for consistency
   */
  cleanPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Remove leading 1 if present
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = cleaned.substring(1)
    }
    
    // Ensure it's 10 digits
    if (cleaned.length !== 10) {
      throw new Error('Invalid phone number format')
    }
    
    return cleaned
  }
}

module.exports = new ReferralService()