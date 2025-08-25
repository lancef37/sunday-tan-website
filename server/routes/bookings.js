const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const User = require('../models/User')
const { sendSMS, sendBookingNotification, sendPendingBookingSMS, sendConfirmationSMS, sendDenialSMS } = require('../services/sms')
const { createPayment } = require('../services/payment')
const { authenticateUser } = require('./userAuth')

router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('Booking request received:', req.body)
    console.log('User making booking:', req.user.email)
    const { date, time, smsConsent, promoCode } = req.body
    
    // Get user details from authenticated user
    const clientName = req.user.name
    const clientPhone = req.user.phone
    const clientEmail = req.user.email
    const userId = req.user._id

    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' })
    }

    // Validate SMS consent
    if (!smsConsent) {
      return res.status(400).json({ error: 'SMS consent is required' })
    }

    // Check for existing booking
    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }

    // Create booking
    console.log('Creating booking...')
    const booking = new Booking({
      date,
      time,
      userId,
      clientName,
      clientPhone,
      clientEmail,
      smsConsent,
      promoCode: promoCode ? { code: promoCode, discountAmount: 0 } : null
    })

    await booking.save()
    console.log('Booking saved:', booking._id)

    // Handle client record
    console.log('Processing client record...')
    let client = await Client.findOne({ userId: userId })
    if (!client) {
      // Check if there's an existing client with same phone (legacy data)
      client = await Client.findOne({ phone: clientPhone })
      if (client) {
        // Link existing client to user
        client.userId = userId
        await client.save()
        console.log('Linked existing client to user:', client._id)
      } else {
        // Create new client
        console.log('Creating new client...')
        client = new Client({
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          userId: userId
        })
        await client.save()
        console.log('New client created:', client._id)
      }
    }

    // Update client appointments
    client.appointments.push({
      date,
      bookingId: booking._id
    })
    client.totalAppointments += 1
    client.lastVisit = new Date()
    await client.save()
    console.log('Client updated')

    // Send SMS notifications
    console.log('Sending SMS notifications...')
    try {
      // Send admin notification
      console.log('Sending admin notification...')
      await sendBookingNotification(process.env.ADMIN_PHONE, booking)
      console.log('Admin notification sent')
      
      // Send client pending notification
      console.log('Sending client pending notification...')
      await sendPendingBookingSMS(clientPhone, booking)
      console.log('Client pending notification sent')
    } catch (smsError) {
      console.error('SMS notification failed:', smsError)
      // Continue processing even if SMS fails
    }

    console.log('Booking process completed successfully')
    res.status(201).json({
      booking,
      message: 'Booking request submitted successfully! Please wait for confirmation.'
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: 'Failed to create booking', details: error.message })
  }
})

// Get user's bookings
router.get('/my-bookings', authenticateUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ date: -1, time: -1 })
    res.json(bookings)
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// Admin route to get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ date: 1, time: 1 })
    res.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentId, status } = req.body
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        paymentStatus: status,
        paymentId: paymentId,
        status: status === 'paid' ? 'confirmed' : 'pending'
      },
      { new: true }
    )
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    res.json(booking)
  } catch (error) {
    console.error('Payment update error:', error)
    res.status(500).json({ error: 'Failed to update payment' })
  }
})

module.exports = router