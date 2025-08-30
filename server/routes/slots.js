const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const BlockedSlot = require('../models/BlockedSlot')
const Availability = require('../models/Availability')
const TempReservation = require('../models/TempReservation')

function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = []
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startTimeMinutes = startHour * 60 + startMinute
  const endTimeMinutes = endHour * 60 + endMinute
  
  for (let minutes = startTimeMinutes; minutes < endTimeMinutes; minutes += slotDuration) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    slots.push(timeString)
  }
  
  return slots
}

function generateTimeSlotsFromBlocks(timeBlocks, slotDuration) {
  const allSlots = []
  
  timeBlocks.forEach(block => {
    const blockSlots = generateTimeSlots(block.startTime, block.endTime, slotDuration)
    allSlots.push(...blockSlots)
  })
  
  // Remove duplicates and sort
  return [...new Set(allSlots)].sort()
}

function getDayOfWeek(dateString) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const date = new Date(dateString)
  return dayNames[date.getDay()]
}

function isDateInFuture(dateString) {
  const today = new Date()
  const targetDate = new Date(dateString)
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate >= today
}

router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params
    
    // Check if date is in the future
    if (!isDateInFuture(date)) {
      return res.json([])
    }
    
    // Get availability settings
    const availability = await Availability.getSingleton()
    
    // Check for date-specific override first
    const dateOverride = availability.dateOverrides.find(override => override.date === date)
    
    let allSlots = []
    
    if (dateOverride) {
      
      if (dateOverride.type === 'closed') {
        // For closed overrides, check if specific time blocks are defined
        if (dateOverride.timeBlocks && dateOverride.timeBlocks.length > 0) {
          // Get the regular schedule for this day
          const dayOfWeek = getDayOfWeek(date)
          const daySchedule = availability.weeklySchedule[dayOfWeek]
          
          if (daySchedule.enabled && daySchedule.timeBlocks && daySchedule.timeBlocks.length > 0) {
            // Start with regular schedule
            allSlots = generateTimeSlotsFromBlocks(daySchedule.timeBlocks, availability.slotDuration)
            
            // Remove the blocked time periods
            const blockedSlots = generateTimeSlotsFromBlocks(dateOverride.timeBlocks, availability.slotDuration)
            allSlots = allSlots.filter(slot => !blockedSlots.includes(slot))
            
          } else {
            return res.json([])
          }
        } else {
          // No specific time blocks means entire day is closed
          return res.json([])
        }
      } else {
        // Open override - use override time blocks
        if (dateOverride.timeBlocks && dateOverride.timeBlocks.length > 0) {
          allSlots = generateTimeSlotsFromBlocks(dateOverride.timeBlocks, availability.slotDuration)
        } else {
          return res.json([])
        }
      }
    } else {
      // Use weekly schedule
      const dayOfWeek = getDayOfWeek(date)
      const daySchedule = availability.weeklySchedule[dayOfWeek]
      
      // If day is not enabled, return empty slots
      if (!daySchedule.enabled) {
        return res.json([])
      }
      
      // Generate time slots from time blocks
      if (daySchedule.timeBlocks && daySchedule.timeBlocks.length > 0) {
        allSlots = generateTimeSlotsFromBlocks(daySchedule.timeBlocks, availability.slotDuration)
      } else {
        return res.json([])
      }
    }
    
    
    // Get booked, blocked, and temporarily reserved slots
    const [bookedSlots, blockedSlots, reservedSlots] = await Promise.all([
      Booking.find({ date }).select('time'),
      BlockedSlot.find({ date }).select('time'),
      TempReservation.find({ 
        date, 
        expiresAt: { $gt: new Date() } 
      }).select('time')
    ])

    const unavailableTimes = new Set([
      ...bookedSlots.map(slot => slot.time),
      ...blockedSlots.map(slot => slot.time),
      ...reservedSlots.map(slot => slot.time)
    ])
    

    const availableSlots = allSlots.map(time => ({
      time,
      available: !unavailableTimes.has(time)
    }))
    
    res.json(availableSlots)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available slots' })
  }
})

module.exports = router