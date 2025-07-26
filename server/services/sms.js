const twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

let client = null

if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
  try {
    client = twilio(accountSid, authToken)
  } catch (error) {
    console.log('Twilio initialization failed - SMS simulation mode enabled')
    client = null
  }
} else {
  console.log('Twilio credentials not configured - SMS simulation mode enabled')
}

async function sendSMS(to, message) {
  try {
    if (!client) {
      console.log('Twilio not configured - SMS simulation mode')
      console.log(`Would send SMS to ${to}: ${message}`)
      return { success: true, simulation: true }
    }

    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    })

    console.log('SMS sent successfully:', response.sid)
    return { success: true, sid: response.sid }
    
  } catch (error) {
    console.error('SMS sending error:', error)
    throw error
  }
}

async function sendBookingNotification(adminPhone, booking) {
  const message = `✨ Sunday Tan - New Booking Alert ✨

📅 ${booking.date} at ${booking.time}
👤 ${booking.clientName}
📞 ${booking.clientPhone}
💳 Payment: ${booking.paymentStatus}

Time to make someone glow! ☀️`

  return await sendSMS(adminPhone, message)
}

async function sendConfirmationSMS(clientPhone, booking) {
  const message = `✨ Sunday Tan - Booking Confirmed ✨

Your glow session is scheduled:
📅 ${booking.date} at ${booking.time}

We can't wait to help you achieve that perfect sun-kissed glow! ☀️

Need to reschedule? Just give us a call!

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
  sendConfirmationSMS,
  sendReminderSMS
}