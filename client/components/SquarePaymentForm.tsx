'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    Square: any;
    _squareInitialized?: boolean;
  }
}

interface SquarePaymentFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
  isLoading?: boolean;
}

// Global variable to track initialization
let globalSquareCard: any = null
let globalSquarePayments: any = null

export default function SquarePaymentForm({ 
  amount, 
  onPaymentSuccess, 
  onPaymentError,
  isLoading = false 
}: SquarePaymentFormProps) {
  const [payments, setPayments] = useState<any>(null)
  const [card, setCard] = useState<any>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isSquareLoaded, setIsSquareLoaded] = useState(false)
  const [cardErrors, setCardErrors] = useState<string>('')
  const componentId = useRef(`square-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    // Destroy any existing global card first
    if (globalSquareCard) {
      try {
        globalSquareCard.destroy()
        globalSquareCard = null
      } catch (error) {
        console.log('Error destroying existing card:', error)
      }
    }

    const loadSquareSDK = async () => {
      // Check if Square is already loaded
      if (window.Square) {
        initializeSquare()
        return
      }

      // Load Square Web Payments SDK only if not already loaded
      if (!document.querySelector('script[src*="square.js"]')) {
        const script = document.createElement('script')
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'
        script.async = true
        script.onload = () => {
          setIsSquareLoaded(true)
          initializeSquare()
        }
        script.onerror = () => {
          onPaymentError('Failed to load Square payment form')
        }
        document.head.appendChild(script)
      } else {
        // Script already loaded, just initialize
        setTimeout(initializeSquare, 100)
      }
    }

    const initializeSquare = async () => {
      if (!window.Square || !cardRef.current) {
        console.log('Square SDK not ready, retrying...')
        setTimeout(initializeSquare, 100)
        return
      }

      try {
        const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

        if (!applicationId) {
          onPaymentError('Square Application ID not configured')
          return
        }

        // Clear the container first
        if (cardRef.current) {
          cardRef.current.innerHTML = ''
        }

        // Create new payments instance
        const payments = window.Square.payments(applicationId, locationId)
        globalSquarePayments = payments
        setPayments(payments)

        const card = await payments.card()
        console.log('Card object created:', card, 'Component ID:', componentId.current)
        console.log('Attaching to element:', cardRef.current)
        
        await card.attach(cardRef.current)
        console.log('Card attached successfully')
        
        globalSquareCard = card
        setCard(card)

        // Listen for card events
        card.addEventListener('cardBrandChanged', (event: any) => {
          console.log('Card brand changed:', event.cardBrand)
        })

        card.addEventListener('errorClassAdded', (event: any) => {
          console.log('Card error:', event)
          setCardErrors('Please check your card information')
        })

        card.addEventListener('errorClassRemoved', () => {
          setCardErrors('')
        })

      } catch (error) {
        console.error('Error initializing Square:', error)
        onPaymentError('Failed to initialize payment form')
      }
    }

    loadSquareSDK()

    // Cleanup function
    return () => {
      if (globalSquareCard) {
        try {
          globalSquareCard.destroy()
          globalSquareCard = null
        } catch (error) {
          console.log('Error destroying card:', error)
        }
      }
    }
  }, [])

  const handlePayment = async () => {
    if (!globalSquareCard || !globalSquarePayments) {
      onPaymentError('Payment form not ready')
      return
    }

    try {
      // Tokenize the card
      const result = await globalSquareCard.tokenize()
      
      if (result.status === 'OK') {
        console.log('Card tokenized successfully:', result.token)
        onPaymentSuccess({
          sourceId: result.token,
          amount: amount
        })
      } else {
        let errorMessage = 'Payment failed'
        
        if (result.errors) {
          errorMessage = result.errors.map((error: any) => error.message).join(', ')
        }
        
        console.error('Tokenization failed:', result.errors)
        console.error('Full result object:', result)
        onPaymentError(errorMessage)
      }
    } catch (error) {
      console.error('Payment error:', error)
      onPaymentError('Payment processing failed')
    }
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  if (amount === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">No Payment Required!</h3>
        <p className="text-green-700">Your promocode covers the full deposit amount.</p>
        <button
          onClick={() => onPaymentSuccess({ sourceId: 'promo-free', amount: 0 })}
          className="mt-4 btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Complete Booking'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-tan-50 p-4 rounded-lg border border-tan-200">
        <h3 className="font-semibold text-tan-900 mb-2">Payment Summary</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Deposit Amount:</span>
          <span className="text-xl font-bold text-tan-700">${formatAmount(amount * 100)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Secure payment powered by Square. Your card information is encrypted and secure.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div 
            ref={cardRef} 
            className="min-h-[56px] p-3 border border-tan-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-tan-500 focus-within:border-tan-500"
          />
          {cardErrors && (
            <p className="mt-2 text-sm text-red-600">{cardErrors}</p>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Test with card number: 4111 1111 1111 1111</p>
          <p>• Use any future expiration date and any 3-digit CVV</p>
          <p>• This is a sandbox environment for testing</p>
        </div>

        <button
          onClick={handlePayment}
          disabled={!globalSquareCard || isLoading}
          className="w-full btn-primary"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            `Pay $${formatAmount(amount * 100)}`
          )}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Sandbox Testing Mode</p>
            <p className="mt-1">This is a test environment. No real charges will be made.</p>
          </div>
        </div>
      </div>
    </div>
  )
}