let squareAvailable = false;
let Client, Environment;

try {
  const square = require('square');
  Client = square.Client;
  Environment = square.Environment;
  squareAvailable = true;
} catch (error) {
}

const Membership = require('../models/Membership');
const MembershipUsage = require('../models/MembershipUsage');

class SquareSubscriptionService {
  constructor() {
    this.isEnabled = process.env.SQUARE_ENABLED === 'true' && squareAvailable;
    
    if (this.isEnabled && squareAvailable && Environment) {
      try {
        const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
          ? Environment.Production 
          : Environment.Sandbox;
        
        this.client = new Client({
          accessToken: process.env.SQUARE_ACCESS_TOKEN,
          environment
        });
        
        this.locationId = process.env.SQUARE_LOCATION_ID;
        this.catalogApi = this.client.catalogApi;
        this.subscriptionsApi = this.client.subscriptionsApi;
        this.customersApi = this.client.customersApi;
        this.webhooksApi = this.client.webhooksApi;
      } catch (error) {
        this.isEnabled = false;
      }
    } else {
      this.isEnabled = false;
    }
  }

  async createOrGetSubscriptionPlan() {
    if (!this.isEnabled) {
      return { id: 'SIMULATED_PLAN_ID' };
    }

    try {
      const searchResponse = await this.catalogApi.searchCatalogItems({
        textFilter: {
          keywords: ['Sunday Tan Membership']
        }
      });

      if (searchResponse.result.items && searchResponse.result.items.length > 0) {
        return searchResponse.result.items[0];
      }

      const response = await this.catalogApi.upsertCatalogObject({
        idempotencyKey: `membership-plan-${Date.now()}`,
        object: {
          type: 'SUBSCRIPTION_PLAN',
          id: '#sunday_tan_membership',
          subscriptionPlanData: {
            name: 'Sunday Tan Membership',
            phases: [{
              cadence: 'MONTHLY',
              periods: null,
              recurringPriceMoney: {
                amount: 10500, // $105.00 in cents
                currency: 'USD'
              }
            }]
          }
        }
      });

      return response.result.catalogObject;
    } catch (error) {
      throw error;
    }
  }

  async createOrGetCustomer(user) {
    if (!this.isEnabled) {
      return { id: `SIMULATED_CUSTOMER_${user._id}` };
    }

    try {
      const searchResponse = await this.customersApi.searchCustomers({
        filter: {
          emailAddress: {
            exact: user.email
          }
        }
      });

      if (searchResponse.result.customers && searchResponse.result.customers.length > 0) {
        return searchResponse.result.customers[0];
      }

      const response = await this.customersApi.createCustomer({
        givenName: user.name.split(' ')[0],
        familyName: user.name.split(' ').slice(1).join(' '),
        emailAddress: user.email,
        phoneNumber: user.phone
      });

      return response.result.customer;
    } catch (error) {
      throw error;
    }
  }

  async createSubscription(user, cardId = null) {
    console.log('\n=== SQUARE SUBSCRIPTION PAYMENT TRIGGERED ===');
    console.log('Creating subscription for user:', {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      cardId: cardId ? cardId.substring(0, 10) + '...' : 'none'
    });
    
    try {
      // Check for existing cancelled membership first
      const existingMembership = await Membership.findOne({
        userId: user._id,
        status: 'cancelled'
      });
      
      const plan = await this.createOrGetSubscriptionPlan();
      const customer = await this.createOrGetCustomer(user);
      
      console.log('Subscription Plan ID:', plan.id);
      console.log('Customer ID:', customer.id);
      
      if (!this.isEnabled) {
        console.log('Square not enabled - using simulation mode');
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        let membership;
        
        if (existingMembership) {
          // Reactivate the cancelled membership
          existingMembership.status = 'active';
          existingMembership.startDate = now;
          existingMembership.nextBillingDate = nextMonth;
          existingMembership.billingCycleStart = now;
          existingMembership.billingCycleEnd = nextMonth;
          existingMembership.squareSubscriptionId = 'SIMULATED_SUB_' + Date.now();
          existingMembership.squareCustomerId = customer.id;
          existingMembership.tansUsedThisMonth = 0;
          existingMembership.cancellationDate = undefined;
          existingMembership.cancellationReason = undefined;
          
          await existingMembership.save();
          membership = existingMembership;
        } else {
          // Create new membership
          membership = await Membership.create({
            userId: user._id,
            status: 'active',
            startDate: now,
            nextBillingDate: nextMonth,
            billingCycleStart: now,
            billingCycleEnd: nextMonth,
            squareSubscriptionId: 'SIMULATED_SUB_' + Date.now(),
            squareCustomerId: customer.id,
            tansUsedThisMonth: 0
          });
        }

        user.membershipId = membership._id;
        await user.save();

        // Create initial payment record for test/sandbox mode
        const MembershipPayment = require('../models/MembershipPayment');
        const simulatedPaymentId = 'SIMULATED_PAYMENT_' + Date.now();
        console.log('Creating simulated membership payment:');
        console.log('Amount: $105.00');
        console.log('Payment ID:', simulatedPaymentId);
        console.log('Membership ID:', membership._id);
        
        await MembershipPayment.create({
          membershipId: membership._id,
          userId: user._id,
          amount: 105, // Monthly subscription fee
          type: 'subscription',
          description: 'Initial monthly membership fee',
          paymentDate: now,
          billingPeriodStart: now,
          billingPeriodEnd: nextMonth,
          status: 'paid',
          squarePaymentId: simulatedPaymentId
        });
        
        console.log('✅ SIMULATED MEMBERSHIP PAYMENT CREATED!');
        console.log('=== END SQUARE SUBSCRIPTION PAYMENT ===\n');

        return {
          subscription: { id: membership.squareSubscriptionId },
          membership
        };
      }

      const subscriptionRequest = {
        locationId: this.locationId,
        planId: plan.id,
        customerId: customer.id,
        startDate: new Date().toISOString().split('T')[0]
      };

      if (cardId) {
        subscriptionRequest.cardId = cardId;
      }

      console.log('Sending subscription to Square API...');
      console.log('Subscription Request:', {
        locationId: subscriptionRequest.locationId,
        planId: subscriptionRequest.planId,
        customerId: subscriptionRequest.customerId,
        startDate: subscriptionRequest.startDate,
        cardId: subscriptionRequest.cardId ? 'provided' : 'not provided'
      });
      
      const response = await this.subscriptionsApi.createSubscription(subscriptionRequest);
      const subscription = response.result.subscription;
      
      console.log('✅ SUBSCRIPTION CREATED!');
      console.log('Subscription ID:', subscription.id);
      console.log('Status:', subscription.status);
      console.log('Monthly Amount: $105.00');

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      let membership;
      
      if (existingMembership) {
        // Reactivate the cancelled membership with new Square subscription
        existingMembership.status = 'active';
        existingMembership.startDate = now;
        existingMembership.nextBillingDate = nextMonth;
        existingMembership.billingCycleStart = now;
        existingMembership.billingCycleEnd = nextMonth;
        existingMembership.squareSubscriptionId = subscription.id;
        existingMembership.squareCustomerId = customer.id;
        existingMembership.tansUsedThisMonth = 0;
        existingMembership.cancellationDate = undefined;
        existingMembership.cancellationReason = undefined;
        
        await existingMembership.save();
        membership = existingMembership;
      } else {
        // Create new membership
        membership = await Membership.create({
          userId: user._id,
          status: 'active',
          startDate: now,
          nextBillingDate: nextMonth,
          billingCycleStart: now,
          billingCycleEnd: nextMonth,
          squareSubscriptionId: subscription.id,
          squareCustomerId: customer.id,
          tansUsedThisMonth: 0
        });
      }

      user.membershipId = membership._id;
      await user.save();

      // Create initial payment record to ensure revenue tracking
      // (webhooks may be delayed or not configured in development)
      const MembershipPayment = require('../models/MembershipPayment');
      const paymentId = subscription.id + '_INITIAL';
      console.log('Creating initial membership payment record:');
      console.log('Amount: $105.00');
      console.log('Payment ID:', paymentId);
      console.log('Invoice ID:', subscription.invoices?.[0]?.id || 'none');
      
      await MembershipPayment.create({
        membershipId: membership._id,
        userId: user._id,
        amount: 105, // Monthly subscription fee
        type: 'subscription',
        description: 'Initial monthly membership fee',
        paymentDate: now,
        billingPeriodStart: now,
        billingPeriodEnd: nextMonth,
        status: 'paid',
        squarePaymentId: paymentId,
        squareInvoiceId: subscription.invoices?.[0]?.id || null
      });
      
      console.log('✅ MEMBERSHIP SUBSCRIPTION PAYMENT COMPLETE!');
      console.log('=== END SQUARE SUBSCRIPTION PAYMENT ===\n');

      return { subscription, membership };
    } catch (error) {
      console.log('❌ SUBSCRIPTION PAYMENT ERROR!');
      console.log('Error:', error.message);
      console.log('=== END SQUARE SUBSCRIPTION PAYMENT ===\n');
      throw error;
    }
  }

  async cancelSubscription(membershipId) {
    try {
      const membership = await Membership.findById(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      if (!this.isEnabled || membership.squareSubscriptionId.startsWith('SIMULATED_')) {
        membership.status = 'cancelled';
        membership.cancellationDate = new Date();
        await membership.save();
        
        return { success: true, membership };
      }

      const response = await this.subscriptionsApi.cancelSubscription(
        membership.squareSubscriptionId
      );

      membership.status = 'cancelled';
      membership.cancellationDate = new Date();
      await membership.save();

      return { success: true, subscription: response.result.subscription, membership };
    } catch (error) {
      throw error;
    }
  }

  async handleWebhook(event) {
    if (!this.isEnabled) {
      return;
    }

    try {
      switch (event.type) {
        case 'subscription.created':
        case 'subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object.subscription);
          break;
        
        case 'invoice.payment_made':
          await this.handleInvoicePayment(event.data.object.invoice);
          break;
        
        case 'subscription.canceled':
          await this.handleSubscriptionCancellation(event.data.object.subscription);
          break;
      }
    } catch (error) {
      throw error;
    }
  }

  async handleSubscriptionUpdate(subscription) {
    const membership = await Membership.findOne({
      squareSubscriptionId: subscription.id
    });

    if (!membership) {
      return;
    }

    if (subscription.status) {
      const statusMap = {
        'ACTIVE': 'active',
        'CANCELED': 'cancelled',
        'PAST_DUE': 'past_due',
        'PAUSED': 'expired'
      };
      
      membership.status = statusMap[subscription.status] || membership.status;
      await membership.save();
    }
  }

  async handleInvoicePayment(invoice) {
    if (invoice.subscription_id) {
      const membership = await Membership.findOne({
        squareSubscriptionId: invoice.subscription_id
      });

      if (membership) {
        // Create payment record for the subscription payment
        const MembershipPayment = require('../models/MembershipPayment');
        
        // Calculate billing period dates
        const paymentDate = new Date(invoice.payment_date || invoice.created_at);
        const billingPeriodEnd = new Date(paymentDate);
        billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
        
        await MembershipPayment.create({
          membershipId: membership._id,
          userId: membership.userId,
          amount: invoice.total_money.amount / 100, // Convert from cents to dollars
          type: 'subscription',
          description: 'Monthly membership fee',
          paymentDate: paymentDate,
          billingPeriodStart: paymentDate,
          billingPeriodEnd: billingPeriodEnd,
          status: 'paid',
          squarePaymentId: invoice.payment_requests?.[0]?.uid || invoice.id,
          squareInvoiceId: invoice.id
        });
        
        // Reset monthly usage for new billing period
        await membership.resetMonthlyUsage();
      }
    }
  }

  async handleSubscriptionCancellation(subscription) {
    const membership = await Membership.findOne({
      squareSubscriptionId: subscription.id
    });

    if (membership) {
      membership.status = 'cancelled';
      membership.cancellationDate = new Date();
      await membership.save();
    }
  }

  async getCheckoutLink(user) {
    if (!this.isEnabled) {
      return {
        success: true,  // Changed to true to allow simulation mode to proceed
        message: 'Square payments not configured. Using simulation mode.',
        simulationMode: true
      };
    }

    try {
      const plan = await this.createOrGetSubscriptionPlan();
      const customer = await this.createOrGetCustomer(user);

      const response = await this.client.checkoutApi.createCheckout(this.locationId, {
        idempotencyKey: `checkout-${user._id}-${Date.now()}`,
        order: {
          locationId: this.locationId,
          customerId: customer.id,
          lineItems: [{
            name: 'Sunday Tan Membership - First Month',
            quantity: '1',
            basePriceMoney: {
              amount: 10500, // $105.00
              currency: 'USD'
            }
          }]
        },
        merchantSupportEmail: process.env.BUSINESS_EMAIL || 'support@sundaytan.com',
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/membership/success`
      });

      return {
        success: true,
        checkoutUrl: response.result.checkout.checkoutPageUrl,
        checkoutId: response.result.checkout.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SquareSubscriptionService();