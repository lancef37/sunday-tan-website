const mongoose = require('mongoose')

// Time block schema for reusable time ranges
const timeBlockSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },   // HH:MM format
}, { _id: false })

const availabilitySchema = new mongoose.Schema({
  // Regular weekly schedule with multiple time blocks per day
  weeklySchedule: {
    monday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema] // Array of time blocks for the day
    },
    tuesday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    },
    wednesday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    },
    thursday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    },
    friday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    },
    saturday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    },
    sunday: {
      enabled: { type: Boolean, default: false },
      timeBlocks: [timeBlockSchema]
    }
  },
  
  // Specific date and time overrides
  dateOverrides: [{
    date: {
      type: String, // YYYY-MM-DD format
      required: true
    },
    type: {
      type: String,
      enum: ['open', 'closed'], // 'open' for custom hours, 'closed' for blocking time
      required: true
    },
    timeBlocks: [timeBlockSchema], // Multiple time blocks for open overrides
    reason: {
      type: String, // Optional reason for override
    }
  }],
  
  // General settings
  slotDuration: {
    type: Number, // Duration in minutes
    default: 30
  },
  bufferTime: {
    type: Number, // Buffer time between appointments in minutes
    default: 0
  },
  advanceBookingDays: {
    type: Number, // How many days in advance clients can book
    default: 30
  }
}, {
  timestamps: true
})

// Migration helper to convert old format to new format
availabilitySchema.statics.migrateToTimeBlocks = async function() {
  const availability = await this.findOne()
  if (!availability) return null

  let needsUpdate = false
  
  // Check if we need to migrate weekly schedule
  Object.keys(availability.weeklySchedule).forEach(day => {
    const daySchedule = availability.weeklySchedule[day]
    
    // If it has old format (startTime/endTime instead of timeBlocks)
    if (daySchedule.startTime && daySchedule.endTime && !daySchedule.timeBlocks) {
      daySchedule.timeBlocks = [{
        startTime: daySchedule.startTime,
        endTime: daySchedule.endTime
      }]
      delete daySchedule.startTime
      delete daySchedule.endTime
      needsUpdate = true
    }
    
    // Ensure timeBlocks array exists
    if (!daySchedule.timeBlocks) {
      daySchedule.timeBlocks = []
    }
  })

  // Migrate date overrides to new format
  if (availability.dateOverrides) {
    availability.dateOverrides.forEach(override => {
      // If it has old format (enabled/startTime/endTime)
      if (override.enabled !== undefined && !override.type) {
        override.type = override.enabled ? 'open' : 'closed'
        
        if (override.type === 'open' && override.startTime && override.endTime) {
          override.timeBlocks = [{
            startTime: override.startTime,
            endTime: override.endTime
          }]
        } else {
          override.timeBlocks = []
        }
        
        delete override.enabled
        delete override.startTime
        delete override.endTime
        needsUpdate = true
      }
      
      // Ensure timeBlocks array exists
      if (!override.timeBlocks) {
        override.timeBlocks = []
      }
    })
  }

  if (needsUpdate) {
    await availability.save()
  }
  
  return availability
}

// Ensure only one availability document exists (singleton pattern)
availabilitySchema.statics.getSingleton = async function() {
  let availability = await this.findOne()
  if (!availability) {
    // Create with default time blocks
    availability = await this.create({
      weeklySchedule: {
        monday: { enabled: false, timeBlocks: [] },
        tuesday: { enabled: false, timeBlocks: [] },
        wednesday: { enabled: false, timeBlocks: [] },
        thursday: { enabled: false, timeBlocks: [] },
        friday: { enabled: false, timeBlocks: [] },
        saturday: { enabled: false, timeBlocks: [] },
        sunday: { enabled: false, timeBlocks: [] }
      }
    })
  } else {
    // Migrate existing data if needed
    availability = await this.migrateToTimeBlocks()
  }
  return availability
}

module.exports = mongoose.model('Availability', availabilitySchema)