const TMClient = require('textmagic-rest-client')

const username = process.env.TEXTMAGIC_USERNAME
const apiKey = process.env.TEXTMAGIC_API_KEY
const fromNumber = process.env.TEXTMAGIC_PHONE_NUMBER

let client = null

function validateTextMagicCredentials() {
  
  if (!username) {
    return false
  }
  
  if (!apiKey) {
    return false
  }
  
  if (!fromNumber) {
  }
  
  return true
}

if (validateTextMagicCredentials()) {
  try {
    client = new TMClient(username, apiKey)
  } catch (error) {
    client = null
  }
} else {
}

function validatePhoneNumber(phone) {
  // Basic phone validation - should be digits with optional +1 and formatting
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  const phoneRegex = /^(\+1)?[0-9]{10}$/
  return phoneRegex.test(cleaned)
}

function formatPhoneNumber(phone) {
  // Clean and format phone number for TextMagic
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  
  // Add +1 if not present (for US numbers)
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+' + cleaned
    } else if (cleaned.length === 10) {
      cleaned = '+1' + cleaned
    }
  }
  
  return cleaned
}

async function sendSMS(to, message, checkOptIn = false, isOptedIn = true) {
  try {
    // Check opt-in status if required
    if (checkOptIn && !isOptedIn) {
      return { success: true, skipped: true, reason: 'User opted out of SMS' }
    }

    // Validate phone number format
    if (!validatePhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`)
    }

    // Validate message content
    if (!message || message.length === 0) {
      throw new Error('Empty message provided')
    }

    if (message.length > 1600) {
    }

    // Format phone number for TextMagic
    const formattedPhone = formatPhoneNumber(to)

    // Debug mode - log without sending
    if (process.env.SMS_DEBUG === 'true') {
      return { success: true, debug: true, simulation: true }
    }

    if (!client) {
      return { success: true, simulation: true }
    }

    
    // TextMagic uses a callback-based API, so we wrap it in a Promise
    return new Promise((resolve, reject) => {
      const params = {
        text: message,
        phones: formattedPhone
      }
      
      // Add from number if configured
      if (fromNumber) {
        params.from = fromNumber
      }
      
      client.Messages.send(params, function(err, res) {
        if (err) {
          reject(err)
        } else {
          resolve({ success: true, id: res.id, messageCount: res.messageCount })
        }
      })
    })
    
  } catch (error) {
    throw error
  }
}

async function sendBookingNotification(adminPhone, booking, userOptIn = true) {
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

async function sendPendingBookingSMS(clientPhone, booking, userOptIn = true) {
  const message = `✨ Sunday Tan - Booking Request Received ✨

Thank you for booking with us!
📅 ${booking.date} at ${booking.time}

⏳ Status: PENDING CONFIRMATION
Your appointment is being reviewed and you'll receive confirmation shortly.

💳 No payment has been processed yet - we'll only charge once your appointment is confirmed.

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message, true, userOptIn)
}

async function sendConfirmationSMS(clientPhone, booking, userOptIn = true) {
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

  return await sendSMS(clientPhone, message, true, userOptIn)
}

async function sendDenialSMS(clientPhone, booking, userOptIn = true) {
  const message = `✨ Sunday Tan - Booking Update ✨

We're sorry, but the requested time slot is no longer available:
📅 ${booking.date} at ${booking.time}

💳 Good news: No payment has been processed.

Please visit our website to book a different time that works for you. We have many other available slots!

- The Sunday Tan Team`

  return await sendSMS(clientPhone, message, true, userOptIn)
}

async function sendReminderSMS(clientPhone, booking, userOptIn = true) {
  const message = `🌟 Tomorrow's the day for your glow-up! 🌟

Sunday Tan Reminder:
📅 Tomorrow at ${booking.time}

Prep tips:
• Exfoliate today
• Wear loose, dark clothing
• Arrive with clean, dry skin

Ready to glow? We are! ✨

- Sunday Tan`

  return await sendSMS(clientPhone, message, true, userOptIn)
}

// Send referral reward notification
async function sendReferralRewardSMS(phone, referral, userOptIn = true) {
  let message = ''
  
  if (referral.referrerRewardType === 'membership_discount') {
    message = `Great news! Your friend ${referral.friendName} completed their appointment. You've earned $10 off your next membership bill. Your total pending discount is now applied automatically at renewal! 🎉`
  } else if (referral.referrerRewardCode) {
    message = `Great news! Your friend ${referral.friendName} completed their appointment. Here's your reward code ${referral.referrerRewardCode} for $10 off your next tan. Thank you for spreading the glow! 🌟`
  } else {
    message = `Great news! Your friend ${referral.friendName} completed their appointment. Your referral reward will be processed shortly. Thank you for spreading the glow! ✨`
  }
  
  return await sendSMS(phone, message)
}

module.exports = {
  sendSMS,
  sendBookingNotification,
  sendPendingBookingSMS,
  sendConfirmationSMS,
  sendDenialSMS,
  sendReminderSMS,
  sendReferralRewardSMS
}