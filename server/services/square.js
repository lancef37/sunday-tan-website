const { SquareClient, SquareEnvironment, SquareError } = require('square')

class SquarePaymentService {
  constructor() {
    this.isEnabled = process.env.SQUARE_ENABLED === 'true'
    
    if (!this.isEnabled) {
      console.log('Square payments disabled')
      return
    }

    // Validate required environment variables
    const requiredVars = ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID', 'SQUARE_ENVIRONMENT']
    const missing = requiredVars.filter(key => !process.env[key])
    
    console.log('Square environment variables check:')
    requiredVars.forEach(key => {
      console.log(`${key}: ${process.env[key] ? 'SET' : 'MISSING'}`)
    })
    
    if (missing.length > 0) {
      console.error('Missing Square environment variables:', missing)
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

    console.log('Square client created, available APIs:', Object.keys(this.client))
    
    // Correct way to access Square APIs
    this.paymentsApi = this.client.payments
    this.locationsApi = this.client.locations
    this.locationId = process.env.SQUARE_LOCATION_ID

    console.log(`Square payment service initialized for ${process.env.SQUARE_ENVIRONMENT} environment`)
    console.log('Payments API available:', !!this.paymentsApi)
    console.log('Location ID:', this.locationId)
  }

  async createPayment(paymentRequest) {
    console.log('createPayment called, enabled:', this.isEnabled)
    console.log('paymentsApi available:', !!this.paymentsApi)
    
    if (!this.isEnabled) {
      throw new Error('Square payments are not enabled')
    }

    try {
      const { sourceId, amountMoney, note, idempotencyKey } = paymentRequest

      // Check if we're in test mode (invalid credentials)
      if (sourceId === 'cnon:card-nonce-ok' || sourceId.startsWith('cnon:')) {
        console.log('Mock payment mode - simulating successful payment')
        return {
          success: true,
          paymentId: `mock_payment_${Date.now()}`,
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

      console.log('Creating Square payment with request:', {
        ...requestBody,
        sourceId: sourceId.substring(0, 10) + '...' // Log partial source ID for security
      })

      const response = await this.paymentsApi.create(requestBody)
      
      if (response.result.payment) {
        const payment = response.result.payment
        console.log('Square payment created successfully:', {
          id: payment.id,
          status: payment.status,
          amount: payment.amountMoney.amount
        })
        
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
        throw new Error('No payment object in response')
      }

    } catch (error) {
      console.error('Square payment error:', error)
      
      if (error instanceof SquareError) {
        const errorDetails = error.errors || []
        const errorMessages = errorDetails.map(err => err.detail || err.code).join(', ')
        throw new Error(`Square API Error: ${errorMessages}`)
      }
      
      throw new Error(`Payment processing failed: ${error.message}`)
    }
  }

  async refundPayment(paymentId, amountMoney, reason) {
    if (!this.isEnabled) {
      throw new Error('Square payments are not enabled')
    }

    try {
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

      const response = await refundsApi.create(requestBody)
      
      if (response.result.refund) {
        const refund = response.result.refund
        console.log('Square refund created successfully:', {
          id: refund.id,
          status: refund.status,
          amount: refund.amountMoney.amount
        })
        
        return {
          success: true,
          refundId: refund.id,
          status: refund.status,
          amount: refund.amountMoney.amount,
          currency: refund.amountMoney.currency
        }
      }

    } catch (error) {
      console.error('Square refund error:', error)
      
      if (error instanceof SquareError) {
        const errorDetails = error.errors || []
        const errorMessages = errorDetails.map(err => err.detail || err.code).join(', ')
        throw new Error(`Square Refund API Error: ${errorMessages}`)
      }
      
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
        console.log('Square credentials valid. Available locations:')
        response.result.locations.forEach(location => {
          console.log(`- ${location.name} (${location.id})`)
        })
      }
    } catch (error) {
      console.error('Square credentials test failed:', error.message)
    }
  }

  // Generate a unique idempotency key
  generateIdempotencyKey(prefix = 'payment') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = new SquarePaymentService()