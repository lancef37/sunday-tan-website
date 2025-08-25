const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy for Railway/cloud deployments
app.set('trust proxy', true)

app.use(helmet())
app.use(cors({
  origin: true,
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,  // Increased for development
  // Use default keyGenerator which will work with trust proxy
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
  console.log('Connected to MongoDB')
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

app.use('/api/auth', authRoutes)
app.use('/api/auth/user', userAuthRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/promocodes', promocodeRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/reservations', reservationRoutes)
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

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - Environment: ${process.env.NODE_ENV || 'development'}`)
})