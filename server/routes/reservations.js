const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const TempReservation = require('../models/TempReservation')
const { authenticateUser } = require('./userAuth')
const { sendBookingNotification, sendPendingBookingSMS } = require('../services/sms')

// Create a temporary reservation (replaces immediate booking creation)
router.post('/reserve', authenticateUser, async (req, res) => {
  try {
    const { date, time, smsConsent, promoCode, finalAmount, depositAmount } = req.body
    const userId = req.user._id
    
    // Check if slot is available (not booked or reserved)
    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }
    
    // Check for existing reservations (excluding expired ones)
    const existingReservation = await TempReservation.findOne({
      date,
      time,
      expiresAt: { $gt: new Date() }
    })
    
    if (existingReservation && existingReservation.userId.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Time slot is currently reserved by another user' })
    }
    
    // Cancel any existing reservation by this user for this slot
    if (existingReservation && existingReservation.userId.toString() === userId.toString()) {
      await TempReservation.deleteOne({ _id: existingReservation._id })
    }
    
    // Create session ID for this reservation
    const sessionId = crypto.randomBytes(32).toString('hex')
    
    // Create temporary reservation
    const reservation = new TempReservation({
      date,
      time,
      userId,
      sessionId,
      bookingData: {
        clientName: req.user.name,
        clientPhone: req.user.phone,
        clientEmail: req.user.email,
        smsConsent,
        promoCode: promoCode ? { code: promoCode, discountAmount: 0 } : null,
        finalAmount,
        depositAmount
      }
    })
    
    await reservation.save()
    console.log('Temporary reservation created:', reservation._id)
    
    res.json({
      success: true,
      sessionId,
      expiresAt: reservation.expiresAt,
      message: 'Time slot reserved for 15 minutes'
    })
    
  } catch (error) {
    console.error('Reservation error:', error)
    res.status(500).json({ error: 'Failed to reserve time slot' })
  }
})

// Complete booking (after payment or promo code confirmation)
router.post('/complete', authenticateUser, async (req, res) => {
  try {
    const { sessionId, paymentId, paymentStatus } = req.body
    const userId = req.user._id
    
    // Find the reservation
    const reservation = await TempReservation.findOne({
      sessionId,
      userId,
      expiresAt: { $gt: new Date() }
    })
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found or expired' })
    }
    
    // Check one more time that the slot hasn't been booked
    const existingBooking = await Booking.findOne({
      date: reservation.date,
      time: reservation.time
    })
    
    if (existingBooking) {
      // Clean up the reservation
      await TempReservation.deleteOne({ _id: reservation._id })
      return res.status(400).json({ error: 'Time slot was booked by another user' })
    }
    
    // Create the actual booking
    const bookingData = {
      date: reservation.date,
      time: reservation.time,
      userId,
      clientName: reservation.bookingData.clientName,
      clientPhone: reservation.bookingData.clientPhone,
      clientEmail: reservation.bookingData.clientEmail,
      smsConsent: reservation.bookingData.smsConsent,
      finalAmount: reservation.bookingData.finalAmount,
      depositAmount: reservation.bookingData.depositAmount,
      paymentId,
      paymentStatus: paymentStatus || 'pending',
      status: paymentStatus === 'paid' || paymentStatus === 'waived' || !reservation.bookingData.depositAmount ? 'confirmed' : 'pending'
    }
    
    // Only add promoCode if it exists and is not null
    if (reservation.bookingData.promoCode && reservation.bookingData.promoCode.code) {
      bookingData.promoCode = reservation.bookingData.promoCode
    }
    
    const booking = new Booking(bookingData)
    
    await booking.save()
    console.log('Booking confirmed:', booking._id)
    
    // Update client record
    let client = await Client.findOne({ userId })
    if (client) {
      client.appointments.push({
        date: reservation.date,
        bookingId: booking._id
      })
      client.totalAppointments += 1
      client.lastVisit = new Date()
      await client.save()
    }
    
    // Send notifications
    try {
      await sendBookingNotification(process.env.ADMIN_PHONE, booking)
      await sendPendingBookingSMS(reservation.bookingData.clientPhone, booking)
    } catch (smsError) {
      console.error('SMS notification failed:', smsError)
    }
    
    // Delete the temporary reservation
    await TempReservation.deleteOne({ _id: reservation._id })
    
    res.json({
      success: true,
      booking,
      message: 'Booking confirmed successfully!'
    })
    
  } catch (error) {
    console.error('Booking completion error:', error)
    res.status(500).json({ error: 'Failed to complete booking' })
  }
})

// Cancel/release a reservation
router.post('/cancel', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.body
    const userId = req.user._id
    
    const result = await TempReservation.deleteOne({
      sessionId,
      userId
    })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Reservation not found' })
    }
    
    res.json({ success: true, message: 'Reservation cancelled' })
  } catch (error) {
    console.error('Cancellation error:', error)
    res.status(500).json({ error: 'Failed to cancel reservation' })
  }
})

// Check if a slot is available (considers both bookings and active reservations)
router.get('/check-availability/:date/:time', async (req, res) => {
  try {
    const { date, time } = req.params
    
    // Check for existing booking
    const booking = await Booking.findOne({ date, time })
    if (booking) {
      return res.json({ available: false, reason: 'Already booked' })
    }
    
    // Check for active reservation
    const reservation = await TempReservation.findOne({
      date,
      time,
      expiresAt: { $gt: new Date() }
    })
    
    if (reservation) {
      return res.json({ 
        available: false, 
        reason: 'Currently reserved',
        expiresAt: reservation.expiresAt
      })
    }
    
    res.json({ available: true })
  } catch (error) {
    console.error('Availability check error:', error)
    res.status(500).json({ error: 'Failed to check availability' })
  }
})

module.exports = router