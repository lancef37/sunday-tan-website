const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const BlockedSlot = require('../models/BlockedSlot')

function generateTimeSlots() {
  const slots = []
  for (let hour = 9; hour <= 17; hour++) {
    slots.push(`${hour}:00`)
    if (hour < 17) {
      slots.push(`${hour}:30`)
    }
  }
  return slots
}

router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params
    const allSlots = generateTimeSlots()
    
    const [bookedSlots, blockedSlots] = await Promise.all([
      Booking.find({ date }).select('time'),
      BlockedSlot.find({ date }).select('time')
    ])

    const unavailableTimes = new Set([
      ...bookedSlots.map(slot => slot.time),
      ...blockedSlots.map(slot => slot.time)
    ])

    const availableSlots = allSlots.map(time => ({
      time,
      available: !unavailableTimes.has(time)
    }))

    res.json(availableSlots)
  } catch (error) {
    console.error('Error fetching slots:', error)
    res.status(500).json({ error: 'Failed to fetch available slots' })
  }
})

module.exports = router