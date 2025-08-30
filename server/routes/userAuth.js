const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const Client = require('../models/Client')
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email')
const { validateEmail, validatePhoneNumber, formatPhoneNumber, sanitizeInput } = require('../utils/validation')

const generateToken = (userId) => {
  return jwt.sign(
    { userId, role: 'user' },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: '7d' }
  )
}

router.post('/register', async (req, res) => {
  try {
    let { email, password, name, phone, smsOptIn = false } = req.body

    // Sanitize inputs
    email = sanitizeInput(email)
    name = sanitizeInput(name)
    phone = sanitizeInput(phone)

    if (!email || !password || !name || !phone) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }

    // Format phone number consistently
    phone = formatPhoneNumber(phone) || phone

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const user = new User({
      email,
      password,
      name,
      phone,
      smsOptIn
    })

    await user.save()

    let client = await Client.findOne({ phone })
    if (!client) {
      client = new Client({
        name,
        phone,
        email,
        userId: user._id,
        smsOptIn
      })
      await client.save()
    } else {
      client.userId = user._id
      client.smsOptIn = smsOptIn
      await client.save()
    }

    try {
      await sendWelcomeEmail(email, name)
    } catch (emailError) {
    }

    const token = generateToken(user._id)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        smsOptIn: user.smsOptIn
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: 'If an account exists, a password reset link has been sent' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000)

    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    try {
      await sendPasswordResetEmail(email, resetToken)
    } catch (emailError) {
      return res.status(500).json({ error: 'Failed to send reset email' })
    }

    res.json({ message: 'If an account exists, a password reset link has been sent' })
  } catch (error) {
    res.status(500).json({ error: 'Password reset request failed' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    user.password = newPassword
    user.resetToken = null
    user.resetTokenExpiry = null
    await user.save()

    res.json({ message: 'Password reset successful' })
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' })
  }
})

router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        smsOptIn: user.smsOptIn
      }
    })
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

router.put('/update-sms-preference', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')
    const { smsOptIn } = req.body

    if (typeof smsOptIn !== 'boolean') {
      return res.status(400).json({ error: 'Invalid SMS preference value' })
    }

    // Update User model
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { smsOptIn },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update Client model
    await Client.findOneAndUpdate(
      { phone: user.phone },
      { smsOptIn }
    )

    res.json({
      message: 'SMS preference updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        smsOptIn: user.smsOptIn
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMS preference' })
  }
})

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')
    
    if (decoded.role !== 'user') {
      return res.status(403).json({ error: 'Access denied. User role required.' })
    }

    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    req.user = user
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { router, authenticateUser }