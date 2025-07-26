const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Booking = require('../models/Booking')
const Client = require('../models/Client')
const BlockedSlot = require('../models/BlockedSlot')

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
    const bookings = await Booking.find()
      .sort({ date: -1, time: -1 })
      .limit(50)
    res.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

router.get('/clients', authenticateAdmin, async (req, res) => {
  try {
    const clients = await Client.find()
      .sort({ lastVisit: -1 })
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
    const client = await Client.findByIdAndDelete(req.params.id)
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }
    
    res.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    res.status(500).json({ error: 'Failed to delete client' })
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

module.exports = router