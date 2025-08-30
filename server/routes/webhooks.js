const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Membership = require('../models/Membership');
const MembershipPayment = require('../models/MembershipPayment');
const User = require('../models/User');

// Verify Square webhook signature
function verifySquareWebhook(body, signature, signingKey) {
  const hmac = crypto.createHmac('sha256', signingKey);
  const hash = hmac.update(body).digest('base64');
  return hash === signature;
}

// Square webhook endpoint
router.post('/square', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify webhook signature if in production
    if (process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
      const signature = req.headers['x-square-hmacsha256-signature'];
      const isValid = verifySquareWebhook(
        req.body,
        signature,
        process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
      );
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(req.body.toString());

    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
        
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
        
      case 'invoice.payment_made':
        await handleInvoicePaymentMade(event.data);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data);
        break;
        
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
        
      default:
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle subscription created
async function handleSubscriptionCreated(data) {
  try {
    const { subscription } = data;
    
    // Find user by Square customer ID
    const user = await User.findOne({ 
      squareCustomerId: subscription.customer_id 
    });
    
    if (!user) {
      return;
    }
    
    // Create or update membership
    let membership = await Membership.findOne({ userId: user._id });
    
    if (!membership) {
      membership = new Membership({
        userId: user._id,
        squareSubscriptionId: subscription.id,
        squareCustomerId: subscription.customer_id,
        status: 'active',
        startDate: new Date(subscription.start_date),
        nextBillingDate: new Date(subscription.charged_through_date),
        billingCycleStart: new Date(subscription.start_date),
        billingCycleEnd: new Date(subscription.charged_through_date)
      });
      await membership.save();
    } else {
      membership.squareSubscriptionId = subscription.id;
      membership.status = 'active';
      await membership.save();
    }
    
  } catch (error) {
  }
}

// Handle invoice payment made
async function handleInvoicePaymentMade(data) {
  try {
    const { invoice } = data;
    
    // Find membership by subscription ID
    const membership = await Membership.findOne({
      squareSubscriptionId: invoice.subscription_id
    });
    
    if (!membership) {
      return;
    }
    
    // Record the payment
    const payment = new MembershipPayment({
      membershipId: membership._id,
      userId: membership.userId,
      amount: invoice.payment_requests[0].computed_amount_money.amount / 100, // Convert cents to dollars
      type: 'subscription',
      description: 'Monthly membership fee',
      paymentDate: new Date(invoice.payment_requests[0].due_date),
      billingPeriodStart: membership.billingCycleStart,
      billingPeriodEnd: membership.billingCycleEnd,
      squarePaymentId: invoice.payment_requests[0].uid,
      squareInvoiceId: invoice.id,
      status: 'paid'
    });
    
    await payment.save();
    
    // Update membership billing dates
    membership.billingCycleStart = new Date(invoice.invoice_date);
    const nextMonth = new Date(invoice.invoice_date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    membership.billingCycleEnd = nextMonth;
    membership.nextBillingDate = nextMonth;
    membership.tansUsedThisMonth = 0; // Reset monthly tan usage
    
    await membership.save();
    
  } catch (error) {
  }
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(data) {
  try {
    const { invoice } = data;
    
    // Find membership by subscription ID
    const membership = await Membership.findOne({
      squareSubscriptionId: invoice.subscription_id
    });
    
    if (!membership) {
      return;
    }
    
    // Record the failed payment
    const payment = new MembershipPayment({
      membershipId: membership._id,
      userId: membership.userId,
      amount: invoice.payment_requests[0].computed_amount_money.amount / 100,
      type: 'subscription',
      description: 'Monthly membership fee - Payment failed',
      paymentDate: new Date(),
      billingPeriodStart: membership.billingCycleStart,
      billingPeriodEnd: membership.billingCycleEnd,
      squareInvoiceId: invoice.id,
      status: 'failed',
      failureReason: 'Card declined or payment failed'
    });
    
    await payment.save();
    
    // Update membership status to past_due
    membership.status = 'past_due';
    await membership.save();
    
  } catch (error) {
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(data) {
  try {
    const { subscription } = data;
    
    const membership = await Membership.findOne({
      squareSubscriptionId: subscription.id
    });
    
    if (!membership) {
      return;
    }
    
    // Update membership status based on subscription status
    if (subscription.status === 'ACTIVE') {
      membership.status = 'active';
    } else if (subscription.status === 'CANCELED') {
      membership.status = 'cancelled';
    } else if (subscription.status === 'PAST_DUE') {
      membership.status = 'past_due';
    }
    
    await membership.save();
  } catch (error) {
  }
}

// Handle subscription canceled
async function handleSubscriptionCanceled(data) {
  try {
    const { subscription } = data;
    
    const membership = await Membership.findOne({
      squareSubscriptionId: subscription.id
    });
    
    if (!membership) {
      return;
    }
    
    membership.status = 'cancelled';
    membership.cancellationDate = new Date();
    membership.cancellationReason = 'User cancelled subscription';
    
    await membership.save();
  } catch (error) {
  }
}

module.exports = router;