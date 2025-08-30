const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Membership = require('../models/Membership');
const MembershipUsage = require('../models/MembershipUsage');
const User = require('../models/User');
const Booking = require('../models/Booking');
const squareSubscriptionService = require('../services/squareSubscription');
const { authenticateUser } = require('./userAuth');

router.post('/subscribe', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { cardId, promoCode } = req.body;

    const existingMembership = await Membership.findOne({
      userId: user._id,
      status: { $in: ['active', 'past_due'] }
    });

    if (existingMembership) {
      return res.status(400).json({ 
        message: 'You already have an active membership' 
      });
    }

    const result = await squareSubscriptionService.createSubscription(user, cardId);
    
    // Process referral code if provided
    if (promoCode) {
      try {
        const PromoCode = require('../models/PromoCode');
        const promo = await PromoCode.findOne({ 
          code: promoCode.toUpperCase() 
        });
        
        if (promo && promo.isValid()) {
          // Check if it's a referral code
          const Referral = require('../models/Referral');
          const referral = await Referral.findOne({ referralCode: promoCode.toUpperCase() });
          
          if (referral && (referral.status === 'sent' || referral.status === 'scheduled')) {
            const referralService = require('../services/referralService');
            await referralService.processForMembership(
              promoCode,
              result.membership._id,
              user._id
            );
            
            // Mark the promo code as used
            promo.usageCount += 1;
            await promo.save();
          }
        }
      } catch (referralError) {
        // Continue even if referral processing fails
      }
    }

    res.json({
      success: true,
      membership: result.membership,
      subscription: result.subscription
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to create subscription',
      error: error.message 
    });
  }
});

router.get('/checkout-link', authenticateUser, async (req, res) => {
  try {
    const user = req.user;

    const existingMembership = await Membership.findOne({
      userId: user._id,
      status: { $in: ['active', 'past_due'] }
    });

    if (existingMembership) {
      return res.status(400).json({ 
        message: 'You already have an active membership' 
      });
    }

    const result = await squareSubscriptionService.getCheckoutLink(user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to create checkout link',
      error: error.message 
    });
  }
});

router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    
    const membership = await Membership.findOne({
      userId: user._id,
      status: { $in: ['active', 'past_due'] }
    });

    if (!membership) {
      return res.json({ 
        hasMembership: false,
        message: 'No active membership found' 
      });
    }

    // Since we now create MembershipUsage records immediately for all bookings,
    // tansUsedThisMonth already includes pending bookings.
    // We should NOT count pending bookings separately to avoid double-counting.
    
    // For backwards compatibility, keep these at 0 since they're already counted
    const pendingMembershipBookings = 0;
    const pendingIncludedTans = 0;
    const pendingAdditionalTans = 0;
    
    console.log('Membership status calculation:', {
      tansUsedThisMonth: membership.tansUsedThisMonth,
      tansIncluded: membership.monthlyTansIncluded,
      pendingCounts: 'Set to 0 to avoid double-counting'
    });

    const usageHistory = await MembershipUsage.find({
      membershipId: membership._id,
      billingCycleStart: membership.billingCycleStart,
      billingCycleEnd: membership.billingCycleEnd,
      status: 'used'
    }).populate('bookingId');

    res.json({
      hasMembership: true,
      membership: {
        id: membership._id,
        status: membership.status,
        startDate: membership.startDate,
        nextBillingDate: membership.nextBillingDate,
        billingCycleStart: membership.billingCycleStart,
        billingCycleEnd: membership.billingCycleEnd,
        tansUsedThisMonth: membership.tansUsedThisMonth,
        tansIncluded: membership.monthlyTansIncluded,
        tansRemaining: membership.getRemainingTans(),
        pendingTans: pendingMembershipBookings,
        pendingIncludedTans,
        pendingAdditionalTans,
        monthlyPrice: membership.monthlyPrice,
        additionalTanPrice: membership.additionalTanPrice,
        productDiscountPercent: membership.productDiscountPercent
      },
      usageHistory: usageHistory.map(usage => ({
        date: usage.usageDate,
        type: usage.type,
        amount: usage.amount,
        booking: usage.bookingId ? {
          date: usage.bookingId.date,
          time: usage.bookingId.time,
          status: usage.bookingId.status
        } : null
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get membership status',
      error: error.message 
    });
  }
});

router.post('/recalculate', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    
    const membership = await Membership.findOne({
      userId: user._id,
      status: { $in: ['active', 'past_due'] }
    });

    if (!membership) {
      return res.status(404).json({ 
        message: 'No active membership found' 
      });
    }
    
    const previousCount = membership.tansUsedThisMonth;
    await membership.recalculateTansUsed();
    
    res.json({
      success: true,
      message: 'Membership usage recalculated',
      previousCount,
      newCount: membership.tansUsedThisMonth,
      tansRemaining: membership.getRemainingTans()
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to recalculate membership usage',
      error: error.message 
    });
  }
});

router.post('/cancel', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { reason } = req.body;

    const membership = await Membership.findOne({
      userId: user._id,
      status: { $in: ['active', 'past_due'] }
    });

    if (!membership) {
      return res.status(404).json({ 
        message: 'No active membership found' 
      });
    }

    if (reason) {
      membership.cancellationReason = reason;
    }

    const result = await squareSubscriptionService.cancelSubscription(membership._id);

    user.membershipId = null;
    await user.save();

    res.json({
      success: true,
      message: 'Membership cancelled successfully',
      membership: result.membership
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to cancel membership',
      error: error.message 
    });
  }
});

router.get('/usage', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;

    const membership = await Membership.findOne({
      userId: user._id
    });

    if (!membership) {
      return res.status(404).json({ 
        message: 'No membership found' 
      });
    }

    const query = {
      membershipId: membership._id
    };

    if (startDate && endDate) {
      query.usageDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      query.billingCycleStart = membership.billingCycleStart;
      query.billingCycleEnd = membership.billingCycleEnd;
    }

    const usage = await MembershipUsage.find(query)
      .populate('bookingId')
      .sort('-usageDate');

    res.json({
      membership: {
        id: membership._id,
        billingCycleStart: membership.billingCycleStart,
        billingCycleEnd: membership.billingCycleEnd,
        tansUsedThisMonth: membership.tansUsedThisMonth,
        tansIncluded: membership.monthlyTansIncluded
      },
      usage: usage.map(u => ({
        id: u._id,
        date: u.usageDate,
        type: u.type,
        amount: u.amount,
        status: u.status,
        refundedAt: u.refundedAt,
        refundReason: u.refundReason,
        booking: {
          id: u.bookingId._id,
          date: u.bookingId.date,
          time: u.bookingId.time,
          status: u.bookingId.status,
          clientName: u.bookingId.clientName
        }
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get usage',
      error: error.message 
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    await squareSubscriptionService.handleWebhook(event);
    
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
});

module.exports = router;