let Client, Environment
try {
  const square = require('square')
  Client = square.Client
  Environment = square.Environment
} catch (error) {
  Client = null
  Environment = null
}

let client = null
if (Client && process.env.SQUARE_ACCESS_TOKEN) {
  client = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox
  })
}

const paymentsApi = client?.paymentsApi
const checkoutApi = client?.checkoutApi

async function createPayment(bookingId, amount, description) {
  try {
    if (!client || !process.env.SQUARE_ACCESS_TOKEN) {
      return null
    }

    const amountInCents = Math.round(amount * 100)
    
    const request = {
      askForShippingAddress: false,
      merchantSupportEmail: process.env.MERCHANT_EMAIL || 'support@sundaytan.com',
      prePopulatedData: {
        buyerEmail: '',
        buyerPhoneNumber: ''
      },
      redirectUrl: `${process.env.CLIENT_URL}/booking-confirmation?booking=${bookingId}`,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        orderSource: {
          name: 'Sunday Tan Booking'
        },
        lineItems: [
          {
            name: description,
            quantity: '1',
            itemType: 'ITEM_VARIATION',
            baseUnitPrice: {
              amount: amountInCents,
              currency: 'USD'
            }
          }
        ]
      }
    }

    const response = await checkoutApi.createCheckout(process.env.SQUARE_LOCATION_ID, request)
    
    if (response.result && response.result.checkout) {
      return response.result.checkout.checkoutPageUrl
    }
    
    throw new Error('No checkout URL returned from Square')
    
  } catch (error) {
    throw error
  }
}

async function verifyPayment(paymentId) {
  try {
    if (!client || !process.env.SQUARE_ACCESS_TOKEN) {
      return { status: 'paid', amount: 25 }
    }

    const response = await paymentsApi.getPayment(paymentId)
    
    if (response.result && response.result.payment) {
      const payment = response.result.payment
      return {
        status: payment.status.toLowerCase(),
        amount: payment.amountMoney.amount / 100
      }
    }
    
    throw new Error('Payment not found')
    
  } catch (error) {
    throw error
  }
}

module.exports = {
  createPayment,
  verifyPayment
}