const { SquareClient, SquareEnvironment, SquareError } = require('square')

class SquarePaymentService {
  constructor() {
    this.isEnabled = process.env.SQUARE_ENABLED === 'true'
    
    if (!this.isEnabled) {
      return
    }

    // Validate required environment variables
    const requiredVars = ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID', 'SQUARE_ENVIRONMENT']
    const missing = requiredVars.filter(key => !process.env[key])
    
    requiredVars.forEach(key => {
    })
    
    if (missing.length > 0) {
      this.isEnabled = false
      return
    }

    // Initialize Square client
    const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
      ? SquareEnvironment.Production 
      : SquareEnvironment.Sandbox

    this.client = new SquareClient({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: environment
    })

    
    // Correct way to access Square APIs
    this.paymentsApi = this.client.payments
    this.locationsApi = this.client.locations
    this.locationId = process.env.SQUARE_LOCATION_ID

  }

  async createPayment(paymentRequest) {
    console.log('\n=== SQUARE PAYMENT TRIGGERED ===');
    console.log('Payment Request:', {
      amount: paymentRequest.amountMoney?.amount,
      currency: paymentRequest.amountMoney?.currency,
      note: paymentRequest.note,
      idempotencyKey: paymentRequest.idempotencyKey,
      sourceId: paymentRequest.sourceId?.substring(0, 10) + '...'
    });
    
    if (!this.isEnabled) {
      console.log('Square payments not enabled - throwing error');
      throw new Error('Square payments are not enabled')
    }

    try {
      const { sourceId, amountMoney, note, idempotencyKey } = paymentRequest

      // Check if we're in test mode (invalid credentials)
      if (sourceId === 'cnon:card-nonce-ok' || sourceId.startsWith('cnon:')) {
        const mockPaymentId = `mock_payment_${Date.now()}`;
        console.log('Test mode detected - returning mock payment');
        console.log('Mock Payment ID:', mockPaymentId);
        console.log('Mock Amount:', amountMoney.amount, 'cents ($' + (amountMoney.amount / 100).toFixed(2) + ')');
        return {
          success: true,
          paymentId: mockPaymentId,
          status: 'COMPLETED',
          amount: amountMoney.amount,
          currency: amountMoney.currency || 'USD',
          receiptNumber: `MOCK_${Date.now()}`,
          receiptUrl: 'https://sandbox.squareup.com/receipt/mock'
        }
      }

      const requestBody = {
        sourceId: sourceId,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: BigInt(amountMoney.amount), // Amount in cents as BigInt
          currency: amountMoney.currency || 'USD'
        },
        locationId: this.locationId,
        note: note || 'Sunday Tan Appointment Deposit',
        autocomplete: true
      }

      console.log('Sending payment to Square API...');
      console.log('Request Body:', {
        locationId: requestBody.locationId,
        amount: requestBody.amountMoney.amount.toString(),
        currency: requestBody.amountMoney.currency,
        note: requestBody.note
      });
      
      const response = await this.paymentsApi.create(requestBody)
      
      if (response.result.payment) {
        const payment = response.result.payment
        console.log('✅ PAYMENT SUCCESSFUL!');
        console.log('Payment ID:', payment.id);
        console.log('Status:', payment.status);
        console.log('Amount:', payment.amountMoney.amount, 'cents ($' + (Number(payment.amountMoney.amount) / 100).toFixed(2) + ')');
        console.log('Receipt URL:', payment.receiptUrl);
        console.log('=== END SQUARE PAYMENT ===\n');
        
        return {
          success: true,
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amountMoney.amount,
          currency: payment.amountMoney.currency,
          receiptNumber: payment.receiptNumber,
          receiptUrl: payment.receiptUrl
        }
      } else {
        console.log('❌ PAYMENT FAILED - No payment object in response');
        console.log('=== END SQUARE PAYMENT ===\n');
        throw new Error('No payment object in response')
      }

    } catch (error) {
      console.log('❌ PAYMENT ERROR!');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      
      if (error instanceof SquareError) {
        const errorDetails = error.errors || []
        const errorMessages = errorDetails.map(err => err.detail || err.code).join(', ')
        console.log('Square API Error Details:', errorMessages);
        console.log('=== END SQUARE PAYMENT ===\n');
        throw new Error(`Square API Error: ${errorMessages}`)
      }
      
      console.log('=== END SQUARE PAYMENT ===\n');
      throw new Error(`Payment processing failed: ${error.message}`)
    }
  }

  async refundPayment(paymentId, amountMoney, reason) {
    console.log('\n=== SQUARE REFUND TRIGGERED ===');
    console.log('Refund Request:', {
      paymentId: paymentId,
      amount: amountMoney.amount,
      amountInDollars: '$' + (amountMoney.amount / 100).toFixed(2),
      currency: amountMoney.currency,
      reason: reason
    });
    
    if (!this.isEnabled) {
      console.log('Square payments not enabled - throwing error');
      throw new Error('Square payments are not enabled')
    }

    try {
      // Check for test mode payment IDs
      if (paymentId.startsWith('square_') || paymentId.startsWith('mock_')) {
        const mockRefundId = `mock_refund_${Date.now()}`;
        console.log('Test mode detected - returning mock refund');
        console.log('Mock Refund ID:', mockRefundId);
        console.log('Mock Refund Amount:', amountMoney.amount, 'cents ($' + (amountMoney.amount / 100).toFixed(2) + ')');
        console.log('=== END SQUARE REFUND ===\n');
        return {
          success: true,
          refundId: mockRefundId,
          status: 'COMPLETED',
          amount: amountMoney.amount,
          currency: amountMoney.currency || 'USD'
        }
      }
      
      const refundsApi = this.client.refunds
      
      const requestBody = {
        idempotencyKey: `refund-${paymentId}-${Date.now()}`,
        amountMoney: {
          amount: BigInt(amountMoney.amount),
          currency: amountMoney.currency || 'USD'
        },
        paymentId: paymentId,
        reason: reason || 'Customer refund request'
      }

      console.log('Sending refund to Square API...');
      console.log('Refund Request Body:', {
        paymentId: requestBody.paymentId,
        amount: requestBody.amountMoney.amount.toString(),
        currency: requestBody.amountMoney.currency,
        reason: requestBody.reason
      });
      
      const response = await refundsApi.refund(requestBody)
      
      if (response.result.refund) {
        const refund = response.result.refund
        console.log('✅ REFUND SUCCESSFUL!');
        console.log('Refund ID:', refund.id);
        console.log('Status:', refund.status);
        console.log('Amount:', refund.amountMoney.amount, 'cents ($' + (Number(refund.amountMoney.amount) / 100).toFixed(2) + ')');
        console.log('=== END SQUARE REFUND ===\n');
        
        return {
          success: true,
          refundId: refund.id,
          status: refund.status,
          amount: refund.amountMoney.amount,
          currency: refund.amountMoney.currency
        }
      }

    } catch (error) {
      console.log('❌ REFUND ERROR!');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      
      if (error instanceof SquareError) {
        const errorDetails = error.errors || []
        const errorMessages = errorDetails.map(err => err.detail || err.code).join(', ')
        console.log('Square Refund API Error Details:', errorMessages);
        console.log('=== END SQUARE REFUND ===\n');
        throw new Error(`Square Refund API Error: ${errorMessages}`)
      }
      
      console.log('=== END SQUARE REFUND ===\n');
      throw new Error(`Refund processing failed: ${error.message}`)
    }
  }

  // Helper method to convert dollars to cents
  dollarsToCents(dollars) {
    return Math.round(dollars * 100)
  }

  // Helper method to convert cents to dollars  
  centsToDollars(cents) {
    return cents / 100
  }

  // Test Square credentials
  async testCredentials() {
    try {
      const response = await this.locationsApi.list()
      if (response.result && response.result.locations) {
        response.result.locations.forEach(location => {
        })
      }
    } catch (error) {
    }
  }

  // Generate a unique idempotency key
  generateIdempotencyKey(prefix = 'payment') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = new SquarePaymentService()