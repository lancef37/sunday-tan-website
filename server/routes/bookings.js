const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const { sendSMS } = require('../services/sms')
const { createPayment } = require('../services/payment')

router.post('/', async (req, res) => {
  try {
    const { date, time, clientName, clientPhone, clientEmail } = req.body

    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }

    const booking = new Booking({
      date,
      time,
      clientName,
      clientPhone,
      clientEmail
    })

    await booking.save()

    let client = await Client.findOne({ phone: clientPhone })
    if (!client) {
      client = new Client({
        name: clientName,
        phone: clientPhone,
        email: clientEmail
      })
    }

    client.appointments.push({
      date,
      bookingId: booking._id
    })
    client.totalAppointments += 1
    client.lastVisit = new Date()
    await client.save()

    try {
      await sendSMS(
        process.env.ADMIN_PHONE,
        `New booking: ${clientName} on ${date} at ${time}. Phone: ${clientPhone}`
      )
    } catch (smsError) {
      console.error('SMS notification failed:', smsError)
    }

    let paymentUrl = null
    if (process.env.SQUARE_ENABLED === 'true') {
      try {
        paymentUrl = await createPayment(booking._id, 25, `Spray tan appointment - ${date} ${time}`)
      } catch (paymentError) {
        console.error('Payment creation failed:', paymentError)
      }
    }

    res.status(201).json({
      booking,
      paymentUrl,
      message: 'Booking created successfully'
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    res.status(500).json({ error: 'Failed to create booking' })
  }
})

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