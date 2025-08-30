// Input validation utilities

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePhoneNumber(phone) {
  if (!phone) return false
  // Remove all formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  // Check if it's a valid 10-digit US phone number (with optional +1)
  const phoneRegex = /^(\+1)?[0-9]{10}$/
  return phoneRegex.test(cleaned)
}

function formatPhoneNumber(phone) {
  if (!phone) return null
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  // Remove leading +1 if present
  if (cleaned.startsWith('+1')) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }
  // Ensure it's 10 digits
  if (cleaned.length !== 10) {
    return null
  }
  // Format as (XXX) XXX-XXXX
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
}

function validateDate(dateString) {
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) return false
  
  const date = new Date(dateString)
  // Check if date is valid
  if (isNaN(date.getTime())) return false
  
  // Check if date is not in the past (allow today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

function validateTimeSlot(time) {
  // Check format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  // Remove any HTML tags and trim whitespace
  return input.replace(/<[^>]*>/g, '').trim()
}

module.exports = {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
  validateDate,
  validateTimeSlot,
  sanitizeInput
}