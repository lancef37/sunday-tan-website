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
const Membership = require('../models/Membership')
const MembershipUsage = require('../models/MembershipUsage')
const MembershipPayment = require('../models/MembershipPayment')
const User = require('../models/User')
const { sendConfirmationSMS, sendDenialSMS } = require('../services/sms')
const { createPayment } = require('../services/payment')
const { generateCancellationToken } = require('./cancellations')

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
    
    
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
    
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
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/bookings', authenticateAdmin, async (req, res) => {
  try {
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
      .lean()
    
    
    res.json(bookings)
  } catch (error) {
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
      .lean()
    
    // Check for active memberships for each client
    const User = require('../models/User')
    const Membership = require('../models/Membership')
    
    const clientsWithMembership = await Promise.all(
      clients.map(async (client) => {
        const clientData = { ...client }
        
        // Find user by email or phone to check membership
        const user = await User.findOne({
          $or: [
            { email: client.email },
            { phone: client.phone }
          ]
        })
        
        if (user) {
          const activeMembership = await Membership.findOne({
            userId: user._id,
            status: { $in: ['active', 'past_due'] }
          })
          
          clientData.hasActiveMembership = !!activeMembership
          if (activeMembership) {
            clientData.membershipStatus = activeMembership.status
          }
        } else {
          clientData.hasActiveMembership = false
        }
        
        return clientData
      })
    )
    
    res.json(clientsWithMembership)
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to update client' })
  }
})

router.delete('/clients/:id', authenticateAdmin, async (req, res) => {
  try {
    
    const client = await Client.findById(req.params.id)
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }
    
    // Find all bookings for this client
    const clientBookings = await Booking.find({ clientPhone: client.phone })
    
    // Delete all bookings for this client
    let deletedBookingsCount = 0
    if (clientBookings.length > 0) {
      const deleteResult = await Booking.deleteMany({ clientPhone: client.phone })
      deletedBookingsCount = deleteResult.deletedCount
    }
    
    // Delete the client
    await Client.findByIdAndDelete(req.params.id)
    
    res.json({ 
      message: `Client and ${deletedBookingsCount} associated bookings deleted successfully`,
      deletedBookings: deletedBookingsCount,
      clientName: client.name
    })
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to unblock slot' })
  }
})

// Create manual booking (for walk-ins, parties, etc.)
router.post('/manual-booking', authenticateAdmin, async (req, res) => {
  try {
    const { date, time, notes } = req.body
    
    
    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' })
    }
    
    // Check for existing booking at this time slot
    const existingBooking = await Booking.findOne({ date, time })
    if (existingBooking) {
      return res.status(400).json({ error: 'Time slot is already booked' })
    }
    
    // Check if slot is blocked
    const blockedSlot = await BlockedSlot.findOne({ date, time })
    // Allow admin to override blocked slots for manual bookings if needed
    if (blockedSlot) {
    }
    
    // Create the manual booking with default values
    const manualBooking = new Booking({
      date,
      time,
      clientName: 'Walk-in/Manual Booking',
      clientPhone: '000-000-0000',
      clientEmail: 'manual@sundaytan.com',
      status: 'confirmed', // Skip approval process
      paymentStatus: 'pending', // Will be updated when marked complete
      amount: 0, // No deposit needed
      notes: notes || 'Manual booking created by admin',
      smsConsent: false, // No SMS for manual bookings
      userId: null, // No user association
      membershipApplied: false, // Ensure it's never counted as membership
    })
    
    await manualBooking.save()
    
    
    res.status(201).json({
      message: 'Manual booking created successfully',
      booking: manualBooking
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create manual booking' })
  }
})

// Update booking status and notes with membership tan counting
router.patch('/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, notes, actualRevenue, appointmentRevenue, tipAmount } = req.body
    
    // Get the booking with its current status
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    const oldStatus = booking.status
    const updateData = { status, notes }
    
    // Handle membership tan counting
    // Only apply membership benefits if user was a member when they booked
    if (booking.userId && booking.membershipStatusAtBooking === 'member') {
      const membership = await Membership.findActiveByUserId(booking.userId)
      
      if (membership) {
        // Status changing TO completed - count the tan
        if (status === 'completed' && oldStatus !== 'completed') {
          
          // Check if MembershipUsage already exists (created at booking confirmation)
          let usage = await MembershipUsage.findOne({ 
            bookingId: booking._id,
            status: 'used'
          })
          
          if (!usage) {
            // Legacy booking or booking created before new approval flow - create usage record now
            // Create membership usage record (will determine type and sequence)
            usage = await MembershipUsage.createUsageRecord(booking, membership)
            
            // Update membership tan count
            await membership.recalculateTansUsed()
            
            // Update booking with membership info
            updateData.membershipUsageId = usage._id
            updateData.membershipApplied = true
            updateData.membershipType = usage.type
            updateData.membershipChargeAmount = usage.amount
          } else {
            // Usage already exists from approval - just ensure booking has correct info
            updateData.membershipUsageId = usage._id
            updateData.membershipApplied = true
            updateData.membershipType = booking.membershipType || usage.type
            updateData.membershipChargeAmount = booking.membershipChargeAmount || usage.amount
          }
          
          // Store tip amount in updateData for later use
          updateData.tipAmount = 0; // Will be updated when marking as completed
          
          // Create MembershipPayment record for additional tan charges (if not already created)
          if (usage.type === 'additional' && usage.amount > 0) {
            const MembershipPayment = require('../models/MembershipPayment')
            
            // Check if payment record already exists (created at approval)
            const existingPayment = await MembershipPayment.findOne({
              bookingId: booking._id.toString(),
              type: 'additional_tan'
            })
            
            if (!existingPayment) {
              const payment = new MembershipPayment({
                membershipId: membership._id,
                userId: booking.userId,
                amount: usage.amount,
                type: 'additional_tan',
                description: `Additional tan for booking on ${booking.date}`,
                paymentDate: new Date(),
                billingPeriodStart: membership.billingCycleStart,
                billingPeriodEnd: membership.billingCycleEnd,
                status: 'paid',
                // Link to Square payment if it exists
                squarePaymentId: booking.paymentId || null,
                // Track booking and usage IDs
                bookingId: booking._id.toString(),
                usageId: usage._id.toString()
              })
              
              await payment.save()
            }
          }
          
        }
        // Status changing TO cancelled OR FROM completed - refund the tan
        else if ((status === 'cancelled' && oldStatus !== 'cancelled') || 
                 (oldStatus === 'completed' && status !== 'completed')) {
          
          // Refund the usage - this will trigger recalculation
          const refundedUsage = await MembershipUsage.refundUsage(booking._id)
          
          if (refundedUsage) {
            // Recalculation is handled automatically by refundUsage
            // Refresh membership to get updated tan count
            await membership.recalculateTansUsed()
            
            // Check if the recalculation triggered any refunds
            const recalculationRefundProcessed = refundedUsage.recalculationRefundProcessed;
            
            // Check if this WAS an additional tan before recalculation
            // The refundedUsage still has the old type
            if (refundedUsage.type === 'additional' && refundedUsage.amount > 0) {
              const MembershipPayment = require('../models/MembershipPayment')
              
              // Find the payment record for this booking
              const payment = await MembershipPayment.findOne({
                bookingId: booking._id.toString(),
                type: 'additional_tan',
                status: 'paid'
              })
              
              if (payment) {
                // Process Square refund if payment was made through Square
                if (payment.squarePaymentId) {
                  try {
                    const squareService = require('../services/square')
                    const refundResult = await squareService.refundPayment(
                      payment.squarePaymentId,
                      { 
                        amount: squareService.dollarsToCents(40), // $40 additional tan fee
                        currency: 'USD' 
                      },
                      `Admin cancellation refund for additional tan - ${booking.clientName} - ${booking.date} ${booking.time}`
                    )
                    
                    if (refundResult.success) {
                      payment.squareRefundId = refundResult.refundId
                      payment.refundAmount = 40
                      payment.refundDate = new Date()
                    }
                  } catch (error) {
                    console.error('Failed to process Square refund for additional tan:', error)
                    // Continue with marking as refunded even if Square refund fails
                  }
                }
                
                payment.status = 'refunded'
                payment.refundedAt = new Date()
                payment.refundReason = 'Booking cancelled - tan refunded'
                await payment.save()
              }
            }
            
            // Set refund status based on what happened
            if (refundedUsage.type === 'additional' && refundedUsage.amount > 0) {
              // Direct refund for additional tan
              updateData.refundStatus = 'processed';
              updateData.refundAmount = 40;
            } else if (refundedUsage.type === 'included' && recalculationRefundProcessed) {
              // Included tan cancellation triggered a refund via reordering
              updateData.refundStatus = 'processed';
              updateData.refundAmount = 40;
              console.log('✅ Admin: Member included tan cancellation triggered $40 refund via reordering');
            } else {
              // No refund needed
              updateData.refundStatus = 'not_applicable';
            }
            
            // Don't clear membership fields - we need them for display purposes
            // The booking is already cancelled and the usage was refunded
            // Keeping these fields helps the UI show the correct status
            
          }
        }
      }
    }
    
    // If marking as completed, add revenue and completion timestamp
    if (status === 'completed') {
      // For member bookings, handle tips separately
      // Only apply member logic if they were a member at booking time
      if (booking.membershipApplied && booking.membershipStatusAtBooking === 'member') {
        // Store tip amount
        const tip = tipAmount !== undefined ? parseFloat(tipAmount) : 0;
        updateData.tipAmount = tip;
        
        // Create MembershipPayment record for tips if applicable
        if (tip > 0 && booking.userId) {
          const MembershipPayment = require('../models/MembershipPayment')
          const Membership = require('../models/Membership')
          
          const membership = await Membership.findActiveByUserId(booking.userId)
          if (membership) {
            
            // Tips should always be recorded as 'tip' type
            const description = updateData.membershipType === 'included' 
              ? `Tip for included tan on ${booking.date}` 
              : `Tip for additional tan on ${booking.date}`;
            
            const tipPayment = new MembershipPayment({
              membershipId: membership._id,
              userId: booking.userId,
              amount: tip,
              type: 'tip',
              description: description,
              paymentDate: new Date(),
              billingPeriodStart: membership.billingCycleStart,
              billingPeriodEnd: membership.billingCycleEnd,
              status: 'paid',
              bookingId: booking._id.toString()
            })
            
            await tipPayment.save()
          }
        }
        
        // Revenue calculation for member bookings
        if (updateData.membershipType === 'included') {
          // Included tans: only tip counts as revenue (tan is covered by subscription)
          updateData.appointmentRevenue = tip;  // Only tip collected at appointment
          updateData.actualRevenue = tip;  // Total is just the tip (no deposit for members)
        } else if (updateData.membershipType === 'additional') {
          // Additional tans: charge + tip
          const chargeAmount = updateData.membershipChargeAmount || 40;
          updateData.appointmentRevenue = chargeAmount + tip;  // Amount collected at appointment
          updateData.actualRevenue = chargeAmount + tip;  // Total (no deposit for members)
        }
      } else {
        // Non-member bookings - handle appointment revenue or legacy actualRevenue
        if (appointmentRevenue !== undefined && appointmentRevenue !== null) {
          // New system: appointment revenue excludes deposit
          updateData.appointmentRevenue = parseFloat(appointmentRevenue)
          // Calculate total revenue including deposit
          const depositPaid = booking.paymentStatus === 'paid' ? (booking.depositAmount || 10) : 0
          updateData.actualRevenue = depositPaid + parseFloat(appointmentRevenue)
          updateData.tipAmount = 0; // No separate tip tracking for non-members
        } else if (actualRevenue !== undefined && actualRevenue !== null) {
          // Legacy system: actualRevenue includes everything
          updateData.actualRevenue = parseFloat(actualRevenue)
          // Calculate appointment revenue by subtracting deposit
          const depositPaid = booking.paymentStatus === 'paid' ? (booking.depositAmount || 10) : 0
          updateData.appointmentRevenue = parseFloat(actualRevenue) - depositPaid
          updateData.tipAmount = 0; // No separate tip tracking for non-members
        } else {
          return res.status(400).json({ error: 'Revenue amount is required when marking non-member appointment as completed' })
        }
      }
      updateData.completedAt = new Date()
    }
    
    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    
    // Update client's lastVisit when marking booking as completed
    if (status === 'completed' && oldStatus !== 'completed') {
      try {
        const client = await Client.findOne({ phone: updatedBooking.clientPhone })
        if (client) {
          // Parse the booking date and update lastVisit
          const bookingDate = new Date(updatedBooking.date)
          
          // Only update lastVisit if this booking is more recent than the current lastVisit
          if (!client.lastVisit || bookingDate > new Date(client.lastVisit)) {
            client.lastVisit = bookingDate
            await client.save()
          }
        }
      } catch (clientError) {
        // Continue even if client update fails
      }
      
      // Process referral completion if applicable
      try {
        const referralService = require('../services/referralService')
        const referralResult = await referralService.processCompletion(updatedBooking._id)
        if (referralResult) {
        }
      } catch (referralError) {
        // Continue even if referral processing fails
      }
    }
    
    res.json(updatedBooking)
  } catch (error) {
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
    
    // Get completed appointments and actual revenue (excluding ALL member bookings)
    // Member bookings are tracked entirely in MembershipPayment table
    const [weeklyRevenue, monthlyRevenue, yearlyRevenue] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisWeekStart },
            actualRevenue: { $ne: null },
            // Exclude ALL member bookings from service revenue
            membershipApplied: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { 
              $sum: '$actualRevenue'
            },
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisMonthStart },
            actualRevenue: { $ne: null },
            // Exclude ALL member bookings from service revenue
            membershipApplied: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { 
              $sum: '$actualRevenue'
            },
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: thisYearStart },
            actualRevenue: { $ne: null },
            // Exclude ALL member bookings from service revenue
            membershipApplied: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { 
              $sum: '$actualRevenue'
            },
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
    
    // Get membership revenue
    const [weeklyMembershipRevenue, monthlyMembershipRevenue, yearlyMembershipRevenue] = await Promise.all([
      MembershipPayment.getRevenueForPeriod(thisWeekStart, new Date()),
      MembershipPayment.getRevenueForPeriod(thisMonthStart, new Date()),
      MembershipPayment.getRevenueForPeriod(thisYearStart, new Date())
    ])
    
    // Calculate MRR and membership stats
    const activeMemberships = await Membership.countDocuments({ 
      status: { $in: ['active', 'past_due'] } 
    })
    const mrr = await MembershipPayment.calculateMRR()
    
    // Calculate net revenue (service revenue + membership revenue - expenses)
    const weeklyServiceRevenue = weeklyRevenue[0]?.totalRevenue || 0
    const monthlyServiceRevenue = monthlyRevenue[0]?.totalRevenue || 0
    const yearlyServiceRevenue = yearlyRevenue[0]?.totalRevenue || 0
    
    const weeklyRevenueTotal = weeklyServiceRevenue + weeklyMembershipRevenue.total
    const monthlyRevenueTotal = monthlyServiceRevenue + monthlyMembershipRevenue.total
    const yearlyRevenueTotal = yearlyServiceRevenue + yearlyMembershipRevenue.total
    
    const weeklyExpensesTotal = weeklyExpenses[0]?.totalExpenses || 0
    const monthlyExpensesTotal = monthlyExpenses[0]?.totalExpenses || 0
    const yearlyExpensesTotal = yearlyExpenses[0]?.totalExpenses || 0
    
    // Get monthly completed tans for current year
    const monthlyTans = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: thisYearStart }
        }
      },
      {
        $group: {
          _id: { $month: '$completedAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
    // Get yearly completed tans (all time)
    const yearlyTans = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $ne: null }
        }
      },
      {
        $group: {
          _id: { $year: '$completedAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
    // Get day of week statistics (all time)
    const dayOfWeekStats = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $ne: null }
        }
      },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: { $dateFromString: { dateString: '$date' } } }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
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
    
    // Format monthly data (ensure all 12 months are present)
    const monthlyData = []
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyTans.find(m => m._id === month)
      monthlyData.push({
        month,
        count: monthData ? monthData.count : 0
      })
    }
    
    // Format day of week data (1=Sunday, 7=Saturday in MongoDB)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeekData = []
    for (let day = 1; day <= 7; day++) {
      const dayData = dayOfWeekStats.find(d => d._id === day)
      dayOfWeekData.push({
        day: dayNames[day - 1],
        dayNumber: day,
        count: dayData ? dayData.count : 0
      })
    }
    
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
      serviceRevenue: {
        thisWeek: weeklyServiceRevenue,
        thisMonth: monthlyServiceRevenue,
        thisYear: yearlyServiceRevenue
      },
      membershipRevenue: {
        thisWeek: weeklyMembershipRevenue.total,
        thisMonth: monthlyMembershipRevenue.total,
        thisYear: yearlyMembershipRevenue.total,
        subscription: {
          thisWeek: weeklyMembershipRevenue.subscription,
          thisMonth: monthlyMembershipRevenue.subscription,
          thisYear: yearlyMembershipRevenue.subscription
        },
        additionalTans: {
          thisWeek: weeklyMembershipRevenue.additional_tan,
          thisMonth: monthlyMembershipRevenue.additional_tan,
          thisYear: yearlyMembershipRevenue.additional_tan
        },
        tips: {
          thisWeek: weeklyMembershipRevenue.tip || 0,
          thisMonth: monthlyMembershipRevenue.tip || 0,
          thisYear: yearlyMembershipRevenue.tip || 0
        }
      },
      membershipStats: {
        activeMembers: activeMemberships,
        mrr: mrr,
        averageRevenuePerMember: activeMemberships > 0 ? monthlyMembershipRevenue.total / activeMemberships : 0
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
      monthlyCompletedTans: monthlyData,
      yearlyCompletedTans: yearlyTans.map(y => ({ year: y._id, count: y.count })),
      dayOfWeekStats: dayOfWeekData,
      topClients,
      statusBreakdown: totalStats,
      totalClients: await Client.countDocuments()
    })
  } catch (error) {
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
    
    // Handle membership usage tracking for member bookings
    if (booking.userId && booking.membershipStatusAtBooking === 'member') {
      const membership = await Membership.findActiveByUserId(booking.userId)
      
      if (membership) {
        // Check if booking already has membership type set from reservation
        // This happens when member books multiple tans quickly
        const preCalculatedType = booking.membershipType
        const preCalculatedAmount = booking.membershipChargeAmount
        
        // Create membership usage record (will determine type and sequence)
        const usage = await MembershipUsage.createUsageRecord(booking, membership)
        
        // Update membership tan count
        await membership.recalculateTansUsed()
        
        // If booking had pre-calculated type from reservation, honor it
        // This ensures the price shown at booking time is what gets charged
        if (preCalculatedType && preCalculatedType !== usage.type) {
          // Update the usage record to match what was promised
          usage.type = preCalculatedType
          usage.amount = preCalculatedAmount || (preCalculatedType === 'included' ? 0 : 40)
          await usage.save()
        }
        
        // Update booking with membership info
        booking.membershipUsageId = usage._id
        booking.membershipApplied = true
        booking.membershipType = usage.type
        booking.membershipChargeAmount = usage.amount
        
        // If this is an additional tan, create payment record
        if (usage.type === 'additional' && usage.amount > 0) {
          // Track that payment is needed
          booking.membershipPaymentRequired = true
          
          // Create MembershipPayment record if payment was already made
          if (booking.paymentId && booking.paymentStatus === 'paid') {
            const MembershipPayment = require('../models/MembershipPayment')
            
            const payment = new MembershipPayment({
              membershipId: membership._id,
              userId: booking.userId,
              amount: usage.amount,
              type: 'additional_tan',
              description: `Additional tan for booking on ${booking.date}`,
              paymentDate: new Date(),
              billingPeriodStart: membership.billingCycleStart,
              billingPeriodEnd: membership.billingCycleEnd,
              status: 'paid',
              squarePaymentId: booking.paymentId, // Store Square payment ID
              bookingId: booking._id.toString(),
              usageId: usage._id.toString()
            })
            
            await payment.save()
          }
        }
      }
    }
    
    await booking.save()
    
    // Generate cancellation token for confirmed booking
    try {
      const cancellationToken = await generateCancellationToken(booking._id)
      // Update the booking object with the token for SMS
      booking.cancellationToken = cancellationToken
    } catch (tokenError) {
      // Continue with approval even if token generation fails
    }
    
    // Send confirmation SMS to client if they opted in
    try {
      // Check if client has opted in for SMS
      const client = await Client.findOne({ phone: booking.clientPhone })
      const userOptIn = client?.smsOptIn ?? true // Default to true for backward compatibility
      await sendConfirmationSMS(booking.clientPhone, booking, userOptIn)
    } catch (smsError) {
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
        // Continue without payment
      }
    }
    
    res.json({ 
      booking, 
      paymentUrl,
      message: 'Booking approved successfully' 
    })
  } catch (error) {
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
    
    // Send denial SMS to client if they opted in
    try {
      // Check if client has opted in for SMS
      const client = await Client.findOne({ phone: booking.clientPhone })
      const userOptIn = client?.smsOptIn ?? true // Default to true for backward compatibility
      await sendDenialSMS(booking.clientPhone, booking, userOptIn)
    } catch (smsError) {
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
      // Continue with denial even if client update fails
    }
    
    res.json({ 
      booking, 
      message: 'Booking denied successfully' 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny booking' })
  }
})

// Test route to verify DELETE is working
router.delete('/test/:id', authenticateAdmin, async (req, res) => {
  res.json({ message: 'DELETE route is working', id: req.params.id })
})

// Delete booking permanently
router.delete('/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    // Remove this appointment from client's record if it exists
    try {
      const client = await Client.findOne({ phone: booking.clientPhone })
      
      if (client) {
        
        // Remove the appointment from client's appointments array
        const originalLength = client.appointments.length
        client.appointments = client.appointments.filter(
          apt => {
            const aptBookingId = apt.bookingId ? apt.bookingId.toString() : null
            const currentBookingId = booking._id.toString()
            const shouldKeep = aptBookingId !== currentBookingId
            
            if (!shouldKeep) {
            }
            
            return shouldKeep
          }
        )
        
        const removedCount = originalLength - client.appointments.length
        
        client.totalAppointments = Math.max(0, client.totalAppointments - removedCount)
        
        await client.save()
      } else {
      }
    } catch (clientError) {
      // Continue with deletion even if client update fails
    }
    
    // Clean up membership usage and recalculate if user has membership
    if (booking.userId) {
      try {
        // Delete membership usage record if it exists
        if (booking.membershipUsed) {
          const usageDeleted = await MembershipUsage.deleteOne({ 
            bookingId: booking._id 
          })
        }
        
        // Always recalculate membership tan count if user has active membership
        const membership = await Membership.findOne({ 
          userId: booking.userId,
          status: { $in: ['active', 'past_due'] }
        })
        
        if (membership) {
          await membership.recalculateTansUsed()
        }
      } catch (membershipError) {
        // Continue with deletion even if membership cleanup fails
      }
    }
    
    // Permanently delete the booking
    const deleteResult = await Booking.findByIdAndDelete(req.params.id)
    
    res.json({ 
      message: 'Booking deleted permanently' 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete booking', details: error.message })
  }
})

// Get availability settings
router.get('/availability', authenticateAdmin, async (req, res) => {
  try {
    const availability = await Availability.getSingleton()
    res.json(availability)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability settings' })
  }
})

// Update weekly schedule
router.put('/availability/weekly', authenticateAdmin, async (req, res) => {
  try {
    const availability = await Availability.getSingleton()
    
    availability.weeklySchedule = req.body.weeklySchedule
    if (req.body.slotDuration) availability.slotDuration = req.body.slotDuration
    if (req.body.bufferTime) availability.bufferTime = req.body.bufferTime
    if (req.body.advanceBookingDays) availability.advanceBookingDays = req.body.advanceBookingDays
    
    await availability.save()
    
    res.json({ 
      message: 'Weekly schedule updated successfully',
      availability 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update weekly schedule' })
  }
})

// Add or update date override
router.post('/availability/override', authenticateAdmin, async (req, res) => {
  try {
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
    
    res.json({ 
      message: 'Date override updated successfully',
      availability 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add date override' })
  }
})

// Remove date override
router.delete('/availability/override/:date', authenticateAdmin, async (req, res) => {
  try {
    const availability = await Availability.getSingleton()
    
    const initialLength = availability.dateOverrides.length
    availability.dateOverrides = availability.dateOverrides.filter(
      override => override.date !== req.params.date
    )
    
    if (availability.dateOverrides.length === initialLength) {
      return res.status(404).json({ error: 'Date override not found' })
    }
    
    await availability.save()
    
    res.json({ 
      message: 'Date override removed successfully',
      availability 
    })
  } catch (error) {
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
      .lean()
    
    res.json(expenses)
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// Promocode Management Routes

// Get all promocodes
router.get('/promocodes', authenticateAdmin, async (req, res) => {
  try {
    // Exclude referral reward codes (REWARD-XXX) and referral codes (REF-XXX)
    const promocodes = await PromoCode.find({
      code: { 
        $not: { 
          $regex: '^(REWARD-|REF-)', 
          $options: 'i' 
        } 
      }
    })
      .sort({ createdAt: -1 })
    
    res.json(promocodes)
  } catch (error) {
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
      usageType,
      usageLimit, 
      validUntil 
    } = req.body
    
    if (!code || !description || !discountType || discountValue === undefined) {
      return res.status(400).json({ 
        error: 'Code, description, discount type, and discount value are required' 
      })
    }
    
    // Prevent creation of codes that conflict with referral system
    const upperCode = code.toUpperCase().trim()
    if (upperCode.startsWith('REF-') || upperCode.startsWith('REWARD-')) {
      return res.status(400).json({ 
        error: 'Cannot create promocodes starting with REF- or REWARD- (reserved for referral system)' 
      })
    }
    
    // Check if promocode already exists
    const existingPromo = await PromoCode.findOne({ 
      code: upperCode 
    })
    
    if (existingPromo) {
      return res.status(400).json({ error: 'Promocode already exists' })
    }
    
    const promocode = new PromoCode({
      code: code.toUpperCase().trim(),
      description: description.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      usageType: usageType || 'unlimited',
      usageLimit: usageType === 'total_limit' && usageLimit ? parseInt(usageLimit) : null,
      validUntil: validUntil ? new Date(validUntil) : null
    })
    
    await promocode.save()
    res.status(201).json(promocode)
  } catch (error) {
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
      usageType,
      usageLimit, 
      validUntil 
    } = req.body
    
    const updateData = {}
    if (description !== undefined) updateData.description = description.trim()
    if (discountType !== undefined) updateData.discountType = discountType
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue)
    if (isActive !== undefined) updateData.isActive = isActive
    if (usageType !== undefined) updateData.usageType = usageType
    if (usageLimit !== undefined) updateData.usageLimit = usageType === 'total_limit' && usageLimit ? parseInt(usageLimit) : null
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
    res.status(500).json({ error: 'Failed to delete promocode' })
  }
})

// Referral Management Routes

// Get all referrals with details
router.get('/referrals', authenticateAdmin, async (req, res) => {
  try {
    const Referral = require('../models/Referral')
    const User = require('../models/User')
    
    // Get query parameters for filtering
    const { status, dateFrom, dateTo, search } = req.query
    
    // Build query
    let query = {}
    
    if (status && status !== 'all') {
      query.status = status
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }
    
    // Fetch referrals with referrer details
    const referrals = await Referral.find(query)
      .populate('referrerId', 'name email phone')
      .populate('friendUserId', 'name email')
      .sort({ createdAt: -1 })
      .lean()
    
    // Apply search filter if provided
    let filteredReferrals = referrals
    if (search) {
      const searchLower = search.toLowerCase()
      filteredReferrals = referrals.filter(ref => 
        ref.referrerName?.toLowerCase().includes(searchLower) ||
        ref.friendName?.toLowerCase().includes(searchLower) ||
        ref.referralCode?.toLowerCase().includes(searchLower) ||
        ref.referredPhone?.includes(search)
      )
    }
    
    res.json(filteredReferrals)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' })
  }
})

// Get referral analytics
router.get('/referrals/analytics', authenticateAdmin, async (req, res) => {
  try {
    const Referral = require('../models/Referral')
    const MembershipDiscount = require('../models/MembershipDiscount')
    const Booking = require('../models/Booking')
    
    // Get date ranges
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    
    // Total referrals
    const totalReferrals = await Referral.countDocuments()
    const thisMonthReferrals = await Referral.countDocuments({
      createdAt: { $gte: thisMonthStart }
    })
    
    // Conversion metrics
    const completedReferrals = await Referral.countDocuments({
      status: { $in: ['completed', 'used_for_membership'] }
    })
    const conversionRate = totalReferrals > 0 
      ? ((completedReferrals / totalReferrals) * 100).toFixed(1)
      : 0
    
    // Revenue from referred customers
    const referredBookings = await Booking.aggregate([
      {
        $match: {
          promoCode: { $exists: true },
          'promoCode.code': { $regex: /^REF-/i },
          status: 'completed'
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
    
    const referredRevenue = referredBookings[0]?.totalRevenue || 0
    const referredBookingCount = referredBookings[0]?.count || 0
    
    // Rewards given
    const tanDiscounts = await Referral.countDocuments({
      referrerRewardType: 'tan_discount',
      rewardApplied: true
    })
    
    const membershipDiscounts = await MembershipDiscount.aggregate([
      {
        $match: {
          type: 'referral',
          status: { $in: ['pending', 'applied'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
    
    const totalMembershipDiscountAmount = membershipDiscounts[0]?.totalAmount || 0
    const membershipDiscountCount = membershipDiscounts[0]?.count || 0
    
    // Top referrers
    const topReferrersAgg = await Referral.aggregate([
      {
        $group: {
          _id: '$referrerId',
          referrerName: { $first: '$referrerName' },
          totalReferrals: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'used_for_membership']] },
                1,
                0
              ]
            }
          },
          pendingRewards: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$referrerRewardType', 'membership_discount'] },
                    { $eq: ['$rewardApplied', true] }
                  ]
                },
                '$referrerRewardAmount',
                0
              ]
            }
          }
        }
      },
      { $sort: { successful: -1, totalReferrals: -1 } },
      { $limit: 10 }
    ])
    
    // Populate user data for top referrers and calculate revenue
    const User = require('../models/User')
    const topReferrers = await Promise.all(topReferrersAgg.map(async (referrer) => {
      const user = await User.findById(referrer._id).select('name phone email').lean()
      
      // Calculate revenue from this referrer's completed referrals
      const referrerBookings = await Booking.find({
        referralId: { $exists: true },
        status: 'completed'
      }).populate('referralId').lean()
      
      const referrerRevenue = referrerBookings
        .filter(b => b.referralId && b.referralId.referrerId && b.referralId.referrerId.toString() === referrer._id.toString())
        .reduce((sum, b) => sum + (b.actualRevenue || 0), 0)
      
      return {
        user: user || { name: referrer.referrerName || 'Unknown', phone: 'N/A' },
        referralCount: referrer.totalReferrals,
        completedCount: referrer.successful,
        revenue: referrerRevenue
      }
    }))
    
    // Status breakdown
    const statusBreakdown = await Referral.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
    
    // Monthly trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthData = await Referral.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            sent: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['completed', 'used_for_membership']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
      
      monthlyTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        sent: monthData[0]?.sent || 0,
        completed: monthData[0]?.completed || 0
      })
    }
    
    res.json({
      summary: {
        totalReferrals,
        thisMonthReferrals,
        completedReferrals,
        conversionRate: parseFloat(conversionRate),
        referredRevenue,
        referredBookingCount
      },
      rewards: {
        tanDiscounts,
        membershipDiscountCount,
        totalMembershipDiscountAmount,
        totalRewardsGiven: tanDiscounts * 10 + totalMembershipDiscountAmount
      },
      topReferrers,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
      monthlyTrend
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral analytics' })
  }
})

// Manually record subscription payment for membership
router.post('/membership/:membershipId/record-payment', authenticateAdmin, async (req, res) => {
  try {
    const Membership = require('../models/Membership')
    const MembershipPayment = require('../models/MembershipPayment')
    
    const membership = await Membership.findById(req.params.membershipId)
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' })
    }
    
    // Check if payment already exists for current billing period
    const existingPayment = await MembershipPayment.findOne({
      membershipId: membership._id,
      billingPeriodStart: membership.billingCycleStart,
      billingPeriodEnd: membership.billingCycleEnd,
      type: 'subscription'
    })
    
    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already recorded for this billing period' })
    }
    
    // Create payment record
    const payment = await MembershipPayment.create({
      membershipId: membership._id,
      userId: membership.userId,
      amount: 105, // Monthly subscription fee
      type: 'subscription',
      description: 'Monthly membership fee (manually recorded)',
      paymentDate: new Date(),
      billingPeriodStart: membership.billingCycleStart,
      billingPeriodEnd: membership.billingCycleEnd,
      status: 'paid',
      squarePaymentId: 'MANUAL_' + Date.now()
    })
    
    res.json({ success: true, payment })
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

module.exports = router