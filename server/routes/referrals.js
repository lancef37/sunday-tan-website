const express = require('express')
const router = express.Router()
const referralService = require('../services/referralService')
const { authenticateUser } = require('./userAuth')
const Referral = require('../models/Referral')
const MembershipDiscount = require('../models/MembershipDiscount')
const Membership = require('../models/Membership')

// Send a referral
router.post('/send', authenticateUser, async (req, res) => {
  try {
    const { friendPhone, friendName } = req.body
    const userId = req.user._id
    
    if (!friendPhone || !friendName) {
      return res.status(400).json({ 
        error: 'Friend name and phone number are required' 
      })
    }
    
    // Validate phone format
    const phoneRegex = /^[\d\s\-\(\)\.+]+$/
    if (!phoneRegex.test(friendPhone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format' 
      })
    }
    
    // Check referral limit (10 per month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const referralCount = await Referral.countDocuments({
      referrerId: userId,
      createdAt: { $gte: startOfMonth }
    })
    
    if (referralCount >= 10) {
      return res.status(400).json({ 
        error: 'You have reached the maximum of 10 referrals per month' 
      })
    }
    
    // Create and send referral
    const result = await referralService.createAndSendReferral(
      userId,
      friendPhone,
      friendName
    )
    
    res.json({
      success: true,
      referralCode: result.referralCode,
      message: `Referral code ${result.referralCode} sent to ${friendName}!`
    })
  } catch (error) {
    
    if (error.message === 'Your friend is already a valued client!') {
      return res.status(400).json({ 
        error: 'Your friend is already a valued client!' 
      })
    }
    
    if (error.message === 'Your friend has already been referred!') {
      return res.status(400).json({ 
        error: 'Your friend has already been referred!' 
      })
    }
    
    // Legacy support for old error message
    if (error.message === 'This phone number has already been referred') {
      return res.status(400).json({ 
        error: 'Your friend has already been referred!' 
      })
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to send referral' 
    })
  }
})

// Get user's referral history
router.get('/my-referrals', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id
    
    const referrals = await referralService.getUserReferrals(userId)
    
    // Format for frontend display
    const formattedReferrals = referrals.map(ref => ({
      id: ref._id,
      friendName: ref.friendName,
      friendPhone: ref.referredPhone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
      code: ref.referralCode,
      status: ref.status,
      smsSentAt: ref.smsSentAt,
      scheduledAt: ref.scheduledAt,
      completedAt: ref.completedAt,
      rewardType: ref.referrerRewardType,
      rewardAmount: ref.referrerRewardAmount,
      rewardCode: ref.referrerRewardCode
    }))
    
    res.json(formattedReferrals)
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch referral history' 
    })
  }
})

// Get pending discount amount
router.get('/pending-discount', authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id
    
    // Check if user is a member
    const membership = await Membership.findOne({
      userId,
      status: { $in: ['active', 'past_due'] }
    })
    
    if (!membership) {
      return res.json({
        isMember: false,
        pendingAmount: 0,
        referralCount: 0,
        maxDiscount: 0
      })
    }
    
    const discountInfo = await referralService.calculatePendingDiscount(userId)
    
    res.json({
      isMember: true,
      ...discountInfo
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to calculate pending discount' 
    })
  }
})

// Track referral completion (called by booking completion)
router.post('/track-completion', async (req, res) => {
  try {
    const { bookingId } = req.body
    
    if (!bookingId) {
      return res.status(400).json({ 
        error: 'Booking ID is required' 
      })
    }
    
    const referral = await referralService.processCompletion(bookingId)
    
    if (!referral) {
      return res.json({ 
        message: 'No referral associated with this booking' 
      })
    }
    
    res.json({
      success: true,
      message: 'Referral reward processed successfully',
      referral: {
        code: referral.referralCode,
        rewardType: referral.referrerRewardType,
        rewardApplied: referral.rewardApplied
      }
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to process referral completion' 
    })
  }
})

// Track referral for membership signup
router.post('/track-membership', async (req, res) => {
  try {
    const { referralCode, membershipId, userId } = req.body
    
    if (!referralCode || !membershipId || !userId) {
      return res.status(400).json({ 
        error: 'Referral code, membership ID, and user ID are required' 
      })
    }
    
    const referral = await referralService.processForMembership(
      referralCode,
      membershipId,
      userId
    )
    
    if (!referral) {
      return res.json({ 
        message: 'Invalid or already used referral code' 
      })
    }
    
    res.json({
      success: true,
      message: 'Referral processed for membership signup',
      referral: {
        code: referral.referralCode,
        rewardType: referral.referrerRewardType
      }
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to process membership referral' 
    })
  }
})

// Revert referral on booking cancellation
router.post('/revert', async (req, res) => {
  try {
    const { bookingId } = req.body
    
    if (!bookingId) {
      return res.status(400).json({ 
        error: 'Booking ID is required' 
      })
    }
    
    const referral = await referralService.revertReferral(bookingId)
    
    if (!referral) {
      return res.json({ 
        message: 'No referral to revert or already completed' 
      })
    }
    
    res.json({
      success: true,
      message: 'Referral reverted successfully',
      referralCode: referral.referralCode
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to revert referral' 
    })
  }
})

module.exports = router