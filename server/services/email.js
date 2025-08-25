const nodemailer = require('nodemailer')

const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
  } else {
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
  }
}

const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email:', { to, subject })
      return { messageId: 'email-not-configured' }
    }

    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"Sunday Tan" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return info
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Sunday Tan'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Sunday Tan!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Thank you for creating an account with Sunday Tan. We're excited to have you as part of our community!</p>
            <p>You can now easily book appointments, view your booking history, and manage your account all in one place.</p>
            <p>Ready to get that perfect glow?</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book" class="button">Book Your First Appointment</a>
            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Best regards,<br>The Sunday Tan Team</p>
          </div>
        </div>
      </body>
    </html>
  `
  
  return sendEmail(email, subject, html)
}

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password/${resetToken}`
  const subject = 'Password Reset Request - Sunday Tan'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .warning { color: #d9534f; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your Sunday Tan account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p class="warning">This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>Best regards,<br>The Sunday Tan Team</p>
          </div>
        </div>
      </body>
    </html>
  `
  
  return sendEmail(email, subject, html)
}

const sendBookingConfirmationEmail = async (email, booking) => {
  const subject = 'Booking Confirmation - Sunday Tan'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #8B7355; }
          .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Great news! Your spray tan appointment has been confirmed.</p>
            <div class="details">
              <h3>Appointment Details:</h3>
              <p><strong>Date:</strong> ${booking.date}</p>
              <p><strong>Time:</strong> ${booking.time}</p>
            </div>
            <p>Please arrive 5 minutes early for your appointment.</p>
            <p>If you need to cancel or reschedule, please let us know as soon as possible.</p>
            <p>We look forward to seeing you!</p>
            <p>Best regards,<br>The Sunday Tan Team</p>
          </div>
        </div>
      </body>
    </html>
  `
  
  return sendEmail(email, subject, html)
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail
}