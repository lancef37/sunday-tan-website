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

// Environment detection
const isDevelopmentIP = typeof window !== 'undefined' && 
  window.location.hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
const isLocalhost = typeof window !== 'undefined' && 
  window.location.hostname === 'localhost'
const isDevelopment = isDevelopmentIP || isLocalhost

// Configuration based on environment
const SQUARE_CONFIG = {
  development: {
    maxRetries: 5,
    retryDelay: 1000,
    initTimeout: 10000,
    allowFallback: true,
    debug: true
  },
  production: {
    maxRetries: 3,
    retryDelay: 500,
    initTimeout: 5000,
    allowFallback: false,
    debug: false
  }
}

const config = isDevelopment ? SQUARE_CONFIG.development : SQUARE_CONFIG.production

// Debug logging that can be disabled in production
const debugLog = (...args: any[]) => {
  if (config.debug) {
    console.log('[Square Payment]', ...args)
  }
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
  const [showFallback, setShowFallback] = useState(false)
  const [initRetries, setInitRetries] = useState(0)
  const componentId = useRef(`square-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    // Check if we should skip Square entirely on mobile in development
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isHTTP = window.location.protocol === 'http:'
    
    if (isDevelopment && isMobileDevice && isHTTP) {
      debugLog('Mobile device detected on HTTP - showing fallback immediately')
      setShowFallback(true)
      return
    }

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
          if (config.allowFallback) {
            setShowFallback(true)
          } else {
            onPaymentError('Failed to load Square payment form')
          }
        }
        document.head.appendChild(script)
      } else {
        // Script already loaded, just initialize
        setTimeout(initializeSquare, 100)
      }
    }

    const initializeSquare = async (retryCount = 0) => {
      if (!window.Square || !cardRef.current) {
        debugLog('Square SDK not ready, retry attempt:', retryCount)
        
        if (retryCount < config.maxRetries) {
          setTimeout(() => initializeSquare(retryCount + 1), config.retryDelay)
        } else if (config.allowFallback) {
          debugLog('Max retries reached, showing fallback')
          setShowFallback(true)
        } else {
          onPaymentError('Failed to load payment form. Please refresh and try again.')
        }
        return
      }

      try {
        const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

        debugLog('Initializing with:', { applicationId, locationId, isDevelopment })

        if (!applicationId) {
          if (config.allowFallback) {
            setShowFallback(true)
          } else {
            onPaymentError('Square Application ID not configured')
          }
          return
        }

        // Clear the container first
        if (cardRef.current) {
          cardRef.current.innerHTML = ''
        }

        // Create new payments instance with timeout
        const initPromise = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Square initialization timeout'))
          }, config.initTimeout)

          try {
            const payments = window.Square.payments(applicationId, locationId)
            globalSquarePayments = payments
            setPayments(payments)

            const card = await payments.card()
            debugLog('Card object created:', card, 'Component ID:', componentId.current)
            debugLog('Attaching to element:', cardRef.current)
            
            await card.attach(cardRef.current)
            debugLog('Card attached successfully')
            
            clearTimeout(timeoutId)
            globalSquareCard = card
            setCard(card)

            // Listen for card events
            card.addEventListener('cardBrandChanged', (event: any) => {
              debugLog('Card brand changed:', event.cardBrand)
            })

            card.addEventListener('errorClassAdded', (event: any) => {
              debugLog('Card error:', event)
              setCardErrors('Please check your card information')
            })

            card.addEventListener('errorClassRemoved', () => {
              setCardErrors('')
            })

            resolve(card)
          } catch (err) {
            clearTimeout(timeoutId)
            reject(err)
          }
        })

        await initPromise
        setInitRetries(0) // Reset retry count on success

      } catch (error: any) {
        console.error('Error initializing Square:', error)
        debugLog('Initialization error details:', error.message, error.stack)
        
        if (retryCount < config.maxRetries) {
          debugLog(`Retrying initialization (${retryCount + 1}/${config.maxRetries})...`)
          setInitRetries(retryCount + 1)
          setTimeout(() => initializeSquare(retryCount + 1), config.retryDelay * (retryCount + 1))
        } else if (config.allowFallback) {
          debugLog('Showing fallback payment option')
          setShowFallback(true)
        } else {
          onPaymentError('Failed to initialize payment form. Please refresh and try again.')
        }
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

  // Show fallback UI if Square failed in development
  if (showFallback && isDevelopment) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Payment form unavailable on mobile device
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Due to security requirements, the payment form cannot be loaded over HTTP on mobile devices.</p>
                <p className="mt-2 font-semibold">Payment options:</p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Pay cash at your appointment</li>
                  <li>Send payment via Venmo/Zelle</li>
                  <li>Complete booking on a desktop computer</li>
                </ul>
              </div>
              {initRetries > 0 && (
                <p className="mt-2 text-xs text-yellow-600">
                  Attempted {initRetries} time{initRetries > 1 ? 's' : ''} to load payment form
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => onPaymentSuccess({ sourceId: 'pay-at-appointment', amount: amount })}
            className="mt-4 w-full btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Continue Booking (Pay at Appointment)'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Secure payment powered by Square. Your card information is encrypted and secure.
        </p>
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