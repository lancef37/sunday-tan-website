# Claude Development Rules for Sunday Tan Website

## Project Overview
This is a professional spray tan booking system with a Next.js frontend and Express.js backend. The system includes client booking, admin management, SMS notifications, and Square payment processing.

## Claude Code Subagents
This project includes specialized subagents for improved development speed. See `SUBAGENTS.md` for detailed specifications.

### Available Subagents:
1. **Booking Specialist** - Handles booking flows, availability, and client management
2. **Auth Security Expert** - Manages authentication, JWT tokens, and security
3. **API Backend Specialist** - Designs Express.js routes and database operations
4. **Integration Specialist** - Handles Square payments and Twilio SMS
5. **Testing QA Specialist** - Debugging, testing, and quality assurance
6. **Frontend Specialist** - Next.js/React components and UI development

### Usage Guidelines:
- Match tasks to appropriate specialist subagents
- Use multiple subagents for complex features (Backend → Frontend → Testing)
- Always review subagent outputs for consistency with project patterns

## Authentication & Security Rules

### Admin Authentication
- **Password Storage**: Admin passwords MUST be hashed using bcrypt before storing in environment variables
- **Token Management**: JWT tokens expire after 7 days and require proper validation
- **Cookie Handling**: When authentication issues occur, check for stale `adminToken` cookies that may bypass login
- **Environment Variables**: Always use `process.env.JWT_SECRET` with a fallback for local development

### API Security
- All admin routes MUST use the `authenticateAdmin` middleware
- Rate limiting is configured at 100 requests per 15 minutes
- CORS is enabled for development but should be restricted in production
- Input validation is required for all user inputs

## Development Environment Rules

### Port Configuration
- **Frontend**: Always runs on port 3000 (Next.js default)
- **Backend**: Always runs on port 5000 (configurable via PORT env var)
- **API_URL**: Must be `http://localhost:5000` for local development
- **Environment Files**: 
  - `client/.env.local` takes precedence over root `.env`
  - Clear Next.js cache (`.next` folder) after environment changes

### Database
- **MongoDB**: Local development uses `mongodb://localhost:27017/sunday-tan`
- **Models**: Use existing Mongoose models in `server/models/`
- **Schemas**: Follow existing patterns for new database models

## Code Standards

### File Structure
- **Client**: Next.js app directory structure in `client/app/`
- **Server**: Express routes in `server/routes/`, models in `server/models/`
- **Services**: External integrations (SMS, payments) in `server/services/`

### Error Handling
- Always log errors to console with descriptive messages
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Include helpful error messages in API responses
- Use try-catch blocks for async operations

### Debugging
- Include console.log statements for debugging admin operations
- Log booking operations with client phone numbers and booking IDs
- Log authentication attempts and failures

## API Patterns

### Admin Routes (`/api/admin/`)
- **Authentication**: All routes require valid JWT token
- **Booking Management**: CRUD operations for bookings with status tracking
- **Client Management**: Full client CRUD with appointment history
- **Statistics**: Revenue tracking with actual vs estimated amounts
- **Availability**: Weekly schedule and date override management

### Public Routes
- **Bookings** (`/api/bookings/`): Public booking creation
- **Slots** (`/api/slots/`): Available time slot queries
- **Promocodes** (`/api/promocodes/`): Public promocode validation

## Business Logic Rules

### Booking System
- **Status Flow**: pending → confirmed → completed or cancelled
- **Revenue Tracking**: Use `actualRevenue` field for completed appointments
- **Client Records**: Always update client appointment history when booking status changes
- **Time Slots**: 60-minute appointments with 30-minute buffers

### Payment Integration
- **Square**: Sandbox mode for development, production for live
- **Deposit Amount**: $25 standard deposit (configurable)
- **Payment Links**: Generated only when Square is enabled

### SMS Notifications
- **Twilio**: Send confirmation and denial messages
- **Admin Notifications**: Alert admin phone when new bookings arrive
- **Error Handling**: Continue operations even if SMS fails

## Testing & Quality Assurance

### Before Deployment
- Run lint and typecheck commands if available
- Test all booking flows (create, approve, deny, complete)
- Verify SMS and payment integrations work
- Test admin authentication and password reset
- Check all API endpoints respond correctly

### Common Issues to Check
- Stale authentication cookies causing login bypass
- Environment variable precedence between .env files
- Port conflicts and CORS configuration
- Database connection issues
- SMS/payment service configuration

## Environment Variables Guide

### Required for Basic Functionality
```env
MONGODB_URI=mongodb://localhost:27017/sunday-tan
JWT_SECRET=long-random-string-for-security
ADMIN_PASSWORD_HASH=bcrypt-hashed-password
PORT=5000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Optional Services
```env
# Twilio SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
ADMIN_PHONE=+1234567890

# Square Payments
SQUARE_ENABLED=true
SQUARE_ACCESS_TOKEN=your-token
SQUARE_LOCATION_ID=your-location
SQUARE_ENVIRONMENT=sandbox
```

## Maintenance Commands

### Development
```bash
npm run dev          # Start both frontend and backend
npm run install:all  # Install all dependencies
```

### Troubleshooting
```bash
# Clear Next.js cache after env changes
rm -rf client/.next

# Generate admin password hash
node -e "console.log(require('bcryptjs').hashSync('password', 10))"

# Check port usage (Windows)
netstat -ano | findstr :5000
```

## Common Tasks

### Adding New Features
1. Create database model if needed in `server/models/`
2. Add API routes in `server/routes/`
3. Update admin frontend in `client/app/admin/`
4. Test authentication and permissions
5. Add appropriate error handling and logging

### Debugging Authentication Issues
1. Check for stale `adminToken` cookies in browser
2. Verify JWT_SECRET matches between login and verification
3. Check token expiration (7 days default)
4. Ensure `authenticateAdmin` middleware is applied to protected routes

### Database Changes
1. Follow existing Mongoose schema patterns
2. Add proper validation and default values
3. Update related API endpoints
4. Test data migration if needed

## Security Checklist

- [ ] Admin passwords are properly hashed
- [ ] JWT tokens have appropriate expiration
- [ ] All admin routes use authentication middleware
- [ ] Environment variables don't contain sensitive data in plain text
- [ ] CORS is properly configured for production
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] Error messages don't expose sensitive information

## Notes for Future Development

- The system uses MongoDB with Mongoose ODM
- Frontend is server-side rendered with Next.js 14
- Backend uses Express.js with standard REST patterns
- Authentication is JWT-based with cookie storage
- Payment processing is optional and configurable
- SMS notifications are optional and configurable
- All times are handled in local timezone
- The system is designed for a single-location business

Remember: Always test authentication flows thoroughly when making changes to admin routes or JWT handling.