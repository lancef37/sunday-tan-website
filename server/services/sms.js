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
  const message = `New spray tan booking!
📅 Date: ${booking.date}
⏰ Time: ${booking.time}
👤 Client: ${booking.clientName}
📞 Phone: ${booking.clientPhone}
✅ Payment: ${booking.paymentStatus}`

  return await sendSMS(adminPhone, message)
}

async function sendConfirmationSMS(clientPhone, booking) {
  const message = `Sunday Tan Booking Confirmed!
📅 ${booking.date} at ${booking.time}
We'll see you soon! If you need to reschedule, please call us.`

  return await sendSMS(clientPhone, message)
}

async function sendReminderSMS(clientPhone, booking) {
  const message = `Reminder: You have a spray tan appointment tomorrow at ${booking.time} with Sunday Tan. We're excited to see you!`

  return await sendSMS(clientPhone, message)
}

module.exports = {
  sendSMS,
  sendBookingNotification,
  sendConfirmationSMS,
  sendReminderSMS
}