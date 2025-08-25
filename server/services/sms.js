const twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

let client = null

function validateTwilioCredentials() {
  console.log('Validating Twilio credentials...')
  
  if (!accountSid) {
    console.log('TWILIO_ACCOUNT_SID not set')
    return false
  }
  
  if (!authToken) {
    console.log('TWILIO_AUTH_TOKEN not set')
    return false
  }
  
  if (!fromNumber) {
    console.log('TWILIO_PHONE_NUMBER not set')
    return false
  }
  
  if (!accountSid.startsWith('AC')) {
    console.log('Invalid TWILIO_ACCOUNT_SID format - should start with AC')
    return false
  }
  
  if (authToken.length < 32) {
    console.log('Invalid TWILIO_AUTH_TOKEN - too short')
    return false
  }
  
  console.log('Twilio credentials format validation passed')
  return true
}

if (validateTwilioCredentials()) {
  try {
    console.log('Initializing Twilio client...')
    client = twilio(accountSid, authToken)
    console.log('Twilio client initialized successfully')
  } catch (error) {
    console.error('Twilio initialization failed:', error.message)
    console.log('SMS simulation mode enabled')
    client = null
  }
} else {
  console.log('Twilio credentials not properly configured - SMS simulation mode enabled')
}

function validatePhoneNumber(phone) {
  // Basic phone validation - should be digits with optional +1 and formatting
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  const phoneRegex = /^(\+1)?[0-9]{10}$/
  return phoneRegex.test(cleaned)
}

async function sendSMS(to, message) {
  try {
    // Validate phone number format
    if (!validatePhoneNumber(to)) {
      console.error('Invalid phone number format:', to)
      throw new Error(`Invalid phone number format: ${to}`)
    }

    // Validate message content
    if (!message || message.length === 0) {
      console.error('Empty message provided')
      throw new Error('Empty message provided')
    }

    if (message.length > 1600) {
      console.warn('Message is very long, may cause issues:', message.length)
    }

    // Debug mode - log without sending
    console.log(`SMS_DEBUG environment variable: ${process.env.SMS_DEBUG}`)
    if (process.env.SMS_DEBUG === 'true') {
      console.log('SMS DEBUG MODE - Not sending actual SMS')
      console.log(`DEBUG: Would send SMS to ${to}`)
      console.log(`DEBUG: Message: ${message}`)
      console.log(`DEBUG: From number: ${fromNumber}`)
      console.log(`DEBUG: Client configured: ${!!client}`)
      return { success: true, debug: true, simulation: true }
    }

    if (!client) {
      console.log('Twilio not configured - SMS simulation mode')
      console.log(`Would send SMS to ${to}: ${message}`)
      return { success: true, simulation: true }
    }

    console.log(`Attempting to send SMS to ${to}`)
    console.log(`Message length: ${message.length} characters`)
    
    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    })

    console.log('SMS sent successfully:', response.sid)
    return { success: true, sid: response.sid }
    
  } catch (error) {
    console.error('SMS sending error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status
    })
    throw error
  }
}

async function sendBookingNotification(adminPhone, booking) {
  const message = `✨ Sunday Tan - New Booking Request ✨

📅 ${booking.date} at ${booking.time}
👤 ${booking.clientName}
📞 ${booking.clientPhone}
📧 ${booking.clientEmail}
⏳ Status: PENDING APPROVAL

Please log into admin to approve or deny this request.

Time to make someone glow! ☀️`

  return await sendSMS(adminPhone, message)
}

async function sendPendingBookingSMS(clientPhone, booking) {
  const message = `✨ Sunday Tan - Booking Request Received ✨

Thank you for booking with us!
📅 ${booking.date} at ${booking.time}

⏳ Status: PENDING CONFIRMATION
Your appointment is being reviewed and you'll receive confirmation shortly.

💳 No payment has been processed yet - we'll only charge once your appointment is confirmed.

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message)
}

async function sendConfirmationSMS(clientPhone, booking) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const cancellationUrl = booking.cancellationToken 
    ? `${baseUrl}/api/cancel/${booking.cancellationToken}`
    : null
  
  const cancellationText = cancellationUrl 
    ? `\n🚫 Need to cancel? Use this secure link:\n${cancellationUrl}\n\n(Refunds available if cancelled 48+ hours before appointment)`
    : `\nNeed to reschedule? Just give us a call!`
  
  const message = `✨ Sunday Tan - Booking CONFIRMED! ✨

Your glow session is confirmed:
📅 ${booking.date} at ${booking.time}

💳 We'll now process your $25 deposit to secure this appointment.

We can't wait to help you achieve that perfect sun-kissed glow! ☀️
${cancellationText}

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message)
}

async function sendDenialSMS(clientPhone, booking) {
  const message = `✨ Sunday Tan - Booking Update ✨

We're sorry, but the requested time slot is no longer available:
📅 ${booking.date} at ${booking.time}

💳 Good news: No payment has been processed.

Please visit our website to book a different time that works for you. We have many other available slots!

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message)
}

async function sendReminderSMS(clientPhone, booking) {
  const message = `🌟 Tomorrow's the day for your glow-up! 🌟

Sunday Tan Reminder:
📅 Tomorrow at ${booking.time}

Prep tips:
• Exfoliate today
• Wear loose, dark clothing
• Arrive with clean, dry skin

Ready to glow? We are! ✨

- Sunday Tan`

  return await sendSMS(clientPhone, message)
}

module.exports = {
  sendSMS,
  sendBookingNotification,
  sendPendingBookingSMS,
  sendConfirmationSMS,
  sendDenialSMS,
  sendReminderSMS
}