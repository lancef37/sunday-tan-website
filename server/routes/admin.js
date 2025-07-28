const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const BlockedSlot = require('../models/BlockedSlot')
const Availability = require('../models/Availability')
const Expense = require('../models/Expense')
const PromoCode = require('../models/PromoCode')
const { sendConfirmationSMS, sendDenialSMS } = require('../services/sms')
const { createPayment } = require('../services/payment')

const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }
    req.user = decoded
    next()
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' })
  }
}

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$defaulthashforlocaldevelopment'
    
    console.log('Login attempt:')
    console.log('Password received:', password)
    console.log('Hash from env:', ADMIN_PASSWORD_HASH)
    
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
    console.log('Password validation result:', isValid)
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' })
    }

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    )

    res.json({ token, message: 'Login successful' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/bookings', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin fetching bookings...')
    const { status, startDate, endDate, limit } = req.query
    let query = {}
    
    if (status) {
      query.status = status
    }
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }
    
    const bookings = await Booking.find(query)
      .sort({ date: -1, time: -1 })
      .limit(parseInt(limit) || 100)
    
    console.log(`Found ${bookings.length} bookings`)
    console.log('First few bookings:', bookings.slice(0, 3))
    
    res.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

router.get('/clients', authenticateAdmin, async (req, res) => {
  try {
    const { search, sortBy } = req.query
    let query = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    let sortOptions = { lastVisit: -1 }
    if (sortBy === 'name') sortOptions = { name: 1 }
    if (sortBy === 'appointments') sortOptions = { totalAppointments: -1 }
    
    const clients = await Client.find(query)
      .populate('appointments.bookingId')
      .sort(sortOptions)
    res.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

router.post('/clients', authenticateAdmin, async (req, res) => {
  try {
    const { name, phone, email } = req.body
    
    const existingClient = await Client.findOne({ phone })
    if (existingClient) {
      return res.status(400).json({ error: 'Client with this phone number already exists' })
    }

    const client = new Client({ name, phone, email })
    await client.save()
    
    res.status(201).json(client)
  } catch (error) {
    console.error('Error creating client:', error)
    res.status(500).json({ error: 'Failed to create client' })
  }
})

router.patch('/clients/:id', authenticateAdmin, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }
    
    res.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

router.delete('/clients/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('Delete client request for ID:', req.params.id)
    
    const client = await Client.findById(req.params.id)
    
    if (!client) {
      console.log('Client not found with ID:', req.params.id)
      return res.status(404).json({ error: 'Client not found' })
    }
    
    console.log('Found client:', {
      id: client._id,
      name: client.name,
      phone: client.phone,
      totalAppointments: client.totalAppointments
    })
    
    // Find all bookings for this client
    const clientBookings = await Booking.find({ clientPhone: client.phone })
    console.log(`Found ${clientBookings.length} bookings for client ${client.name}`)
    
    // Delete all bookings for this client
    let deletedBookingsCount = 0
    if (clientBookings.length > 0) {
      const deleteResult = await Booking.deleteMany({ clientPhone: client.phone })
      deletedBookingsCount = deleteResult.deletedCount
      console.log(`Deleted ${deletedBookingsCount} bookings for client`)
    }
    
    // Delete the client
    await Client.findByIdAndDelete(req.params.id)
    console.log('Client deleted successfully')
    
    res.json({ 
      message: `Client and ${deletedBookingsCount} associated bookings deleted successfully`,
      deletedBookings: deletedBookingsCount,
      clientName: client.name
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: 'Failed to delete client', details: error.message })
  }
})

router.post('/block-slot', authenticateAdmin, async (req, res) => {
  try {
    const { date, time, reason } = req.body
    
    const existingSlot = await BlockedSlot.findOne({ date, time })
    if (existingSlot) {
      return res.status(400).json({ error: 'Slot is already blocked' })
    }

    const blockedSlot = new BlockedSlot({ date, time, reason })
    await blockedSlot.save()
    
    res.status(201).json(blockedSlot)
  } catch (error) {
    console.error('Error blocking slot:', error)
    res.status(500).json({ error: 'Failed to block slot' })
  }
})

router.delete('/block-slot/:id', authenticateAdmin, async (req, res) => {
  try {
    const blockedSlot = await BlockedSlot.findByIdAndDelete(req.params.id)
    
    if (!blockedSlot) {
      return res.status(404).json({ error: 'Blocked slot not found' })
    }
    
    res.json({ message: 'Slot unblocked successfully' })
  } catch (error) {
    console.error('Error unblocking slot:', error)
    res.status(500).json({ error: 'Failed to unblock slot' })
  }
})

// Update booking status and notes
router.patch('/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, notes, actualRevenue } = req.body
    
    const updateData = { status, notes }
    
    // If marking as completed, add revenue and completion timestamp
    if (status === 'completed') {
      if (actualRevenue === undefined || actualRevenue === null) {
        return res.status(400).json({ error: 'Revenue amount is required when marking appointment as completed' })
      }
      updateData.actualRevenue = parseFloat(actualRevenue)
      updateData.completedAt = new Date()
    }
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    res.json(booking)
  } catch (error) {
    console.error('Error updating booking:', error)
    res.status(500).json({ error: 'Failed to update booking' })
  }
})

// Get business statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    
    // Get date ranges
    const thisWeekStart = new Date(currentWeek)
    const thisMonthStart = new Date(currentYear, currentMonth, 1)
    const thisYearStart = new Date(currentYear, 0, 1)
    
    // Get completed appointments and actual revenue
    const [weeklyRevenue, monthlyRevenue, yearlyRevenue] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisWeekStart },
            actualRevenue: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$actualRevenue' },
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisMonthStart },
            actualRevenue: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$actualRevenue' },
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisYearStart },
            actualRevenue: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$actualRevenue' },
            count: { $sum: 1 }
          }
        }
      ])
    ])
    
    // Get expenses for the same periods
    const [weeklyExpenses, monthlyExpenses, yearlyExpenses] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            createdAt: { $gte: thisWeekStart }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$cost' }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            createdAt: { $gte: thisMonthStart }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$cost' }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            createdAt: { $gte: thisYearStart }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$cost' }
          }
        }
      ])
    ])
    
    // Calculate net revenue (revenue - expenses)
    const weeklyRevenueTotal = weeklyRevenue[0]?.totalRevenue || 0
    const monthlyRevenueTotal = monthlyRevenue[0]?.totalRevenue || 0
    const yearlyRevenueTotal = yearlyRevenue[0]?.totalRevenue || 0
    
    const weeklyExpensesTotal = weeklyExpenses[0]?.totalExpenses || 0
    const monthlyExpensesTotal = monthlyExpenses[0]?.totalExpenses || 0
    const yearlyExpensesTotal = yearlyExpenses[0]?.totalExpenses || 0
    
    // Other statistics
    const [topClients, totalStats] = await Promise.all([
      Client.find().sort({ totalAppointments: -1 }).limit(10),
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ])
    
    res.json({
      appointments: {
        thisWeek: weeklyRevenue[0]?.count || 0,
        thisMonth: monthlyRevenue[0]?.count || 0,
        thisYear: yearlyRevenue[0]?.count || 0
      },
      revenue: {
        thisWeek: weeklyRevenueTotal,
        thisMonth: monthlyRevenueTotal,
        thisYear: yearlyRevenueTotal
      },
      expenses: {
        thisWeek: weeklyExpensesTotal,
        thisMonth: monthlyExpensesTotal,
        thisYear: yearlyExpensesTotal
      },
      netRevenue: {
        thisWeek: weeklyRevenueTotal - weeklyExpensesTotal,
        thisMonth: monthlyRevenueTotal - monthlyExpensesTotal,
        thisYear: yearlyRevenueTotal - yearlyExpensesTotal
      },
      topClients,
      statusBreakdown: totalStats,
      totalClients: await Client.countDocuments()
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

// Get client details with full booking history
router.get('/clients/:id', authenticateAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate({
        path: 'appointments.bookingId',
        model: 'Booking'
      })
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }
    
    res.json(client)
  } catch (error) {
    console.error('Error fetching client details:', error)
    res.status(500).json({ error: 'Failed to fetch client details' })
  }
})

// Add note to booking
router.post('/bookings/:id/notes', authenticateAdmin, async (req, res) => {
  try {
    const { note } = req.body
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: { notes: note } },
      { new: true }
    )
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    res.json(booking)
  } catch (error) {
    console.error('Error adding note:', error)
    res.status(500).json({ error: 'Failed to add note' })
  }
})

// Approve booking
router.post('/bookings/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking is not pending' })
    }
    
    // Update booking status to confirmed
    booking.status = 'confirmed'
    await booking.save()
    
    // Send confirmation SMS to client
    try {
      await sendConfirmationSMS(booking.clientPhone, booking)
    } catch (smsError) {
      console.error('Failed to send confirmation SMS:', smsError)
      // Continue with approval even if SMS fails
    }
    
    // Create payment link if Square is enabled
    let paymentUrl = null
    if (process.env.SQUARE_ENABLED === 'true') {
      try {
        paymentUrl = await createPayment(booking._id, 25, `Spray tan appointment - ${booking.date} ${booking.time}`)
        booking.paymentUrl = paymentUrl
        await booking.save()
      } catch (paymentError) {
        console.error('Payment creation failed:', paymentError)
        // Continue without payment
      }
    }
    
    res.json({ 
      booking, 
      paymentUrl,
      message: 'Booking approved successfully' 
    })
  } catch (error) {
    console.error('Error approving booking:', error)
    res.status(500).json({ error: 'Failed to approve booking' })
  }
})

// Deny booking
router.post('/bookings/:id/deny', authenticateAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking is not pending' })
    }
    
    // Update booking status to cancelled
    booking.status = 'cancelled'
    await booking.save()
    
    // Send denial SMS to client
    try {
      await sendDenialSMS(booking.clientPhone, booking)
    } catch (smsError) {
      console.error('Failed to send denial SMS:', smsError)
      // Continue with denial even if SMS fails
    }
    
    // Remove this appointment from client's record if it exists
    try {
      const client = await Client.findOne({ phone: booking.clientPhone })
      if (client) {
        // Remove the appointment from client's appointments array
        client.appointments = client.appointments.filter(
          apt => apt.bookingId && apt.bookingId.toString() !== booking._id.toString()
        )
        client.totalAppointments = Math.max(0, client.totalAppointments - 1)
        await client.save()
      }
    } catch (clientError) {
      console.error('Error updating client record:', clientError)
      // Continue with denial even if client update fails
    }
    
    res.json({ 
      booking, 
      message: 'Booking denied successfully' 
    })
  } catch (error) {
    console.error('Error denying booking:', error)
    res.status(500).json({ error: 'Failed to deny booking' })
  }
})

// Test route to verify DELETE is working
router.delete('/test/:id', authenticateAdmin, async (req, res) => {
  console.log('DELETE test route hit with ID:', req.params.id)
  res.json({ message: 'DELETE route is working', id: req.params.id })
})

// Delete booking permanently
router.delete('/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('Delete booking request for ID:', req.params.id)
    
    const booking = await Booking.findById(req.params.id)
    console.log('Found booking:', booking ? 'Yes' : 'No')
    
    if (!booking) {
      console.log('Booking not found with ID:', req.params.id)
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    console.log('Booking details:', {
      id: booking._id,
      client: booking.clientName,
      phone: booking.clientPhone,
      date: booking.date,
      status: booking.status
    })
    
    // Remove this appointment from client's record if it exists
    try {
      console.log('Looking for client with phone:', booking.clientPhone)
      const client = await Client.findOne({ phone: booking.clientPhone })
      
      if (client) {
        console.log('Found client:', client.name, 'with', client.totalAppointments, 'appointments')
        console.log('Client appointments before:', client.appointments.length)
        
        // Remove the appointment from client's appointments array
        const originalLength = client.appointments.length
        client.appointments = client.appointments.filter(
          apt => {
            const aptBookingId = apt.bookingId ? apt.bookingId.toString() : null
            const currentBookingId = booking._id.toString()
            const shouldKeep = aptBookingId !== currentBookingId
            
            if (!shouldKeep) {
              console.log('Removing appointment:', apt.date, 'for booking ID:', aptBookingId)
            }
            
            return shouldKeep
          }
        )
        
        const removedCount = originalLength - client.appointments.length
        console.log('Removed', removedCount, 'appointments from client record')
        
        client.totalAppointments = Math.max(0, client.totalAppointments - removedCount)
        console.log('Updated client total appointments to:', client.totalAppointments)
        
        await client.save()
        console.log('Client record updated successfully')
      } else {
        console.log('No client found with phone:', booking.clientPhone)
      }
    } catch (clientError) {
      console.error('Error updating client record:', clientError)
      // Continue with deletion even if client update fails
    }
    
    // Permanently delete the booking
    console.log('Deleting booking from database...')
    const deleteResult = await Booking.findByIdAndDelete(req.params.id)
    console.log('Booking deleted:', deleteResult ? 'Success' : 'Failed')
    
    res.json({ 
      message: 'Booking deleted permanently' 
    })
  } catch (error) {
    console.error('Error deleting booking:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: 'Failed to delete booking', details: error.message })
  }
})

// Get availability settings
router.get('/availability', authenticateAdmin, async (req, res) => {
  try {
    console.log('Fetching availability settings...')
    const availability = await Availability.getSingleton()
    console.log('Availability settings retrieved')
    res.json(availability)
  } catch (error) {
    console.error('Error fetching availability:', error)
    res.status(500).json({ error: 'Failed to fetch availability settings' })
  }
})

// Update weekly schedule
router.put('/availability/weekly', authenticateAdmin, async (req, res) => {
  try {
    console.log('Updating weekly schedule:', req.body)
    const availability = await Availability.getSingleton()
    
    availability.weeklySchedule = req.body.weeklySchedule
    if (req.body.slotDuration) availability.slotDuration = req.body.slotDuration
    if (req.body.bufferTime) availability.bufferTime = req.body.bufferTime
    if (req.body.advanceBookingDays) availability.advanceBookingDays = req.body.advanceBookingDays
    
    await availability.save()
    console.log('Weekly schedule updated successfully')
    
    res.json({ 
      message: 'Weekly schedule updated successfully',
      availability 
    })
  } catch (error) {
    console.error('Error updating weekly schedule:', error)
    res.status(500).json({ error: 'Failed to update weekly schedule' })
  }
})

// Add or update date override
router.post('/availability/override', authenticateAdmin, async (req, res) => {
  try {
    console.log('Adding date override:', req.body)
    const { date, type, timeBlocks, reason, enabled, startTime, endTime } = req.body
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' })
    }
    
    const availability = await Availability.getSingleton()
    
    // Remove existing override for this date if it exists
    availability.dateOverrides = availability.dateOverrides.filter(
      override => override.date !== date
    )
    
    // Handle both old and new formats
    let newOverride
    if (type !== undefined) {
      // New format with time blocks
      newOverride = {
        date,
        type: type || 'open',
        timeBlocks: timeBlocks || [],
        reason: reason || ''
      }
    } else {
      // Legacy format - convert to new format
      newOverride = {
        date,
        type: enabled ? 'open' : 'closed',
        timeBlocks: enabled && startTime && endTime ? [{ startTime, endTime }] : [],
        reason: reason || ''
      }
    }
    
    // Validate timeBlocks for open overrides
    if (newOverride.type === 'open' && newOverride.timeBlocks.length === 0) {
      return res.status(400).json({ error: 'Open overrides must have at least one time block' })
    }
    
    availability.dateOverrides.push(newOverride)
    
    await availability.save()
    console.log('Date override added successfully')
    
    res.json({ 
      message: 'Date override updated successfully',
      availability 
    })
  } catch (error) {
    console.error('Error adding date override:', error)
    res.status(500).json({ error: 'Failed to add date override' })
  }
})

// Remove date override
router.delete('/availability/override/:date', authenticateAdmin, async (req, res) => {
  try {
    console.log('Removing date override for:', req.params.date)
    const availability = await Availability.getSingleton()
    
    const initialLength = availability.dateOverrides.length
    availability.dateOverrides = availability.dateOverrides.filter(
      override => override.date !== req.params.date
    )
    
    if (availability.dateOverrides.length === initialLength) {
      return res.status(404).json({ error: 'Date override not found' })
    }
    
    await availability.save()
    console.log('Date override removed successfully')
    
    res.json({ 
      message: 'Date override removed successfully',
      availability 
    })
  } catch (error) {
    console.error('Error removing date override:', error)
    res.status(500).json({ error: 'Failed to remove date override' })
  }
})

// Expense Management Routes

// Get all expenses
router.get('/expenses', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query
    let query = {}
    
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }
    
    const expenses = await Expense.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 100)
    
    res.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// Add new expense
router.post('/expenses', authenticateAdmin, async (req, res) => {
  try {
    const { item, cost, notes, category } = req.body
    
    if (!item || cost === undefined || cost === null) {
      return res.status(400).json({ error: 'Item and cost are required' })
    }
    
    const expense = new Expense({
      item: item.trim(),
      cost: parseFloat(cost),
      notes: notes ? notes.trim() : '',
      category: category || 'General'
    })
    
    await expense.save()
    res.status(201).json(expense)
  } catch (error) {
    console.error('Error creating expense:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// Update expense
router.patch('/expenses/:id', authenticateAdmin, async (req, res) => {
  try {
    const { item, cost, notes, category } = req.body
    
    const updateData = {}
    if (item !== undefined) updateData.item = item.trim()
    if (cost !== undefined) updateData.cost = parseFloat(cost)
    if (notes !== undefined) updateData.notes = notes.trim()
    if (category !== undefined) updateData.category = category
    
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }
    
    res.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// Delete expense
router.delete('/expenses/:id', authenticateAdmin, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id)
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }
    
    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// Promocode Management Routes

// Get all promocodes
router.get('/promocodes', authenticateAdmin, async (req, res) => {
  try {
    const promocodes = await PromoCode.find({})
      .sort({ createdAt: -1 })
    
    res.json(promocodes)
  } catch (error) {
    console.error('Error fetching promocodes:', error)
    res.status(500).json({ error: 'Failed to fetch promocodes' })
  }
})

// Create new promocode
router.post('/promocodes', authenticateAdmin, async (req, res) => {
  try {
    const { 
      code, 
      description, 
      discountType, 
      discountValue, 
      usageLimit, 
      validUntil 
    } = req.body
    
    if (!code || !description || !discountType || discountValue === undefined) {
      return res.status(400).json({ 
        error: 'Code, description, discount type, and discount value are required' 
      })
    }
    
    // Check if promocode already exists
    const existingPromo = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    })
    
    if (existingPromo) {
      return res.status(400).json({ error: 'Promocode already exists' })
    }
    
    const promocode = new PromoCode({
      code: code.toUpperCase().trim(),
      description: description.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      validUntil: validUntil ? new Date(validUntil) : null
    })
    
    await promocode.save()
    res.status(201).json(promocode)
  } catch (error) {
    console.error('Error creating promocode:', error)
    res.status(500).json({ error: 'Failed to create promocode' })
  }
})

// Update promocode
router.patch('/promocodes/:id', authenticateAdmin, async (req, res) => {
  try {
    const { 
      description, 
      discountType, 
      discountValue, 
      isActive, 
      usageLimit, 
      validUntil 
    } = req.body
    
    const updateData = {}
    if (description !== undefined) updateData.description = description.trim()
    if (discountType !== undefined) updateData.discountType = discountType
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue)
    if (isActive !== undefined) updateData.isActive = isActive
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null
    
    const promocode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    
    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' })
    }
    
    res.json(promocode)
  } catch (error) {
    console.error('Error updating promocode:', error)
    res.status(500).json({ error: 'Failed to update promocode' })
  }
})

// Delete promocode
router.delete('/promocodes/:id', authenticateAdmin, async (req, res) => {
  try {
    const promocode = await PromoCode.findByIdAndDelete(req.params.id)
    
    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' })
    }
    
    res.json({ message: 'Promocode deleted successfully' })
  } catch (error) {
    console.error('Error deleting promocode:', error)
    res.status(500).json({ error: 'Failed to delete promocode' })
  }
})

module.exports = router