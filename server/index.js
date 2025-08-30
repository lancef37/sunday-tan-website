const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000 // Server port

// Trust proxy for Railway/cloud deployments
app.set('trust proxy', true)

// Production configuration
const isProduction = process.env.NODE_ENV === 'production'

// Security middleware
app.use(helmet())

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)
    
    // In production, use environment variable for allowed origins
    if (isProduction) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : ['https://sunday-tan-website.vercel.app']
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.log(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    } else {
      // In development, allow all origins
      callback(null, true)
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || (isProduction ? 100 : 1000),
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available (for proxied requests)
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
  // Set up automatic cleanup of expired reservations every 5 minutes
  const TempReservation = require('./models/TempReservation')
  setInterval(async () => {
    try {
      const result = await TempReservation.deleteMany({
        expiresAt: { $lt: new Date() }
      })
    } catch (error) {
      // Silent error - reservation cleanup
    }
  }, 5 * 60 * 1000) // Run every 5 minutes
})

const { router: authRoutes } = require('./routes/auth')
const { router: userAuthRoutes } = require('./routes/userAuth')
const bookingRoutes = require('./routes/bookings')
const adminRoutes = require('./routes/admin')
const slotRoutes = require('./routes/slots')
const promocodeRoutes = require('./routes/promocodes')
const paymentRoutes = require('./routes/payments')
const { router: cancellationRoutes } = require('./routes/cancellations')
const reservationRoutes = require('./routes/reservations')
const membershipRoutes = require('./routes/membership')
const webhookRoutes = require('./routes/webhooks')
const referralRoutes = require('./routes/referrals')

app.use('/api/auth', authRoutes)
app.use('/api/auth/user', userAuthRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/promocodes', promocodeRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/referrals', referralRoutes)
app.use('/api', cancellationRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Root endpoint for Railway
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sunday Tan API Server',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      bookings: '/api/bookings',
      admin: '/api/admin',
      slots: '/api/slots'
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)
  
  // Don't expose error details in production
  if (isProduction) {
    res.status(err.status || 500).json({ 
      error: 'Something went wrong!',
      message: err.message || 'Internal server error'
    })
  } else {
    res.status(err.status || 500).json({ 
      error: err.message || 'Something went wrong!',
      stack: err.stack
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  if (isProduction) {
    console.log('Production mode enabled')
    console.log(`CORS origins: ${process.env.ALLOWED_ORIGINS || 'https://sunday-tan-website.vercel.app'}`)
  }
})
