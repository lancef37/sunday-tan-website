# Sunday Tan - Professional Spray Tan Booking Website

A complete booking system for a mobile spray tan business with client management, payment processing, and SMS notifications.

## 🚀 Quick Start Guide (For Beginners)

### Prerequisites
1. **Node.js** - Download and install from [nodejs.org](https://nodejs.org/) (Choose LTS version)
2. **MongoDB** - Either:
   - Install locally from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free cloud database)

### Step 1: Download and Setup
1. Download this project folder to your computer
2. Open Command Prompt (Windows) or Terminal (Mac/Linux)
3. Navigate to the project folder:
   ```
   cd "C:\Users\lfrazer\Desktop\Sunday Tan Website"
   ```

### Step 2: Install Dependencies
Run this command to install all required packages:
```bash
npm run install:all
```

### Step 3: Configure Environment Variables
1. Copy the `.env.example` file and rename it to `.env`
2. Edit the `.env` file with your actual values:

```env
# Basic Setup (Required)
MONGODB_URI=mongodb://localhost:27017/sunday-tan
JWT_SECRET=make-this-a-long-random-string
ADMIN_PASSWORD_HASH=$2a$10$your-hashed-admin-password

# Your wife's phone number for notifications
ADMIN_PHONE=+1234567890

# Square Payment (Optional - can enable later)
SQUARE_ENABLED=false

# Twilio SMS (Optional - can enable later)  
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Generate Admin Password
To create a secure admin password, run:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-chosen-password', 10))"
```
Copy the output and paste it as the `ADMIN_PASSWORD_HASH` value in your `.env` file.

### Step 5: Start the Application
```bash
npm run dev
```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:5000).

### Step 6: Test the Website
1. Open your browser to http://localhost:3000
2. Click "Book Now" to test the booking system
3. Go to http://localhost:3000/admin to access the admin panel

## 📱 Key Features

### Client Booking System
- **Calendar Interface**: Clients can view and select available appointment times
- **Contact Information**: Collects name, phone, and email
- **Payment Integration**: Square payment processing for deposits
- **Automatic Notifications**: SMS alerts to admin when bookings are made

### Admin Dashboard
- **Schedule Management**: View all bookings and their payment status
- **Client Database**: Track client information and appointment history
- **Time Blocking**: Block unavailable time slots
- **Secure Login**: Password-protected admin access

### Payment Processing
- **Square Integration**: Secure payment processing
- **Deposit Collection**: $25 deposit required to confirm bookings
- **Payment Tracking**: Monitor payment status for each booking

### SMS Notifications
- **Booking Alerts**: Instant notifications when clients book
- **Confirmation Messages**: Automated booking confirmations
- **Reminder System**: Appointment reminders (can be scheduled)

## 🔧 Setting Up Payment & SMS

### Square Payment Setup
1. Create a Square account at [squareup.com](https://squareup.com)
2. Get your access token and location ID from the Square Developer Dashboard
3. Update your `.env` file:
   ```env
   SQUARE_ENABLED=true
   SQUARE_ACCESS_TOKEN=your-access-token
   SQUARE_LOCATION_ID=your-location-id
   SQUARE_ENVIRONMENT=sandbox  # Use 'production' when ready to go live
   ```

### Twilio SMS Setup
1. Create a Twilio account at [twilio.com](https://twilio.com)
2. Get your Account SID, Auth Token, and phone number
3. Update your `.env` file:
   ```env
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## 📁 Project Structure

```
sunday-tan-website/
├── client/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx       # Homepage
│   │   ├── book/          # Booking system
│   │   └── admin/         # Admin dashboard
│   └── package.json
├── server/                 # Express.js backend
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   ├── services/          # Payment & SMS services
│   └── index.js           # Server entry point
├── .env                   # Your configuration
└── package.json           # Main project config
```

## 🌐 Deployment

### Option 1: Vercel (Recommended for beginners)
1. Create accounts at [vercel.com](https://vercel.com) and [mongodb.com/atlas](https://mongodb.com/atlas)
2. Connect your GitHub repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy with one click

### Option 2: Traditional Web Hosting
- Frontend: Deploy to Netlify, Vercel, or any static hosting
- Backend: Deploy to Railway, Render, or DigitalOcean
- Database: Use MongoDB Atlas for cloud database

## 🔒 Security Features

- **Password Hashing**: Admin passwords are securely hashed
- **JWT Authentication**: Secure admin session management
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Protects against malicious input
- **CORS Protection**: Restricts cross-origin requests

## 🛠️ Customization

### Changing Business Hours
Edit the time slots in `server/routes/slots.js`:
```javascript
// Change these values to match your business hours
for (let hour = 9; hour <= 17; hour++) {  // 9 AM to 5 PM
```

### Updating Pricing
Modify the deposit amount in `server/routes/bookings.js`:
```javascript
const booking = new Booking({
  // ... other fields
  amount: 25  // Change this value
})
```

### Styling Changes
- Colors: Edit `client/tailwind.config.js`
- Layout: Modify files in `client/app/`
- Business info: Update `client/app/page.tsx`

## 📞 Support

If you encounter any issues:
1. Check that all dependencies are installed
2. Verify your `.env` file has the correct values
3. Make sure MongoDB is running
4. Check the console for error messages

Common commands:
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm install` - Install new packages

## 📋 Todo for Production

- [ ] Set up SSL certificate for HTTPS
- [ ] Configure proper database backups
- [ ] Set up monitoring and logging
- [ ] Test payment processing thoroughly
- [ ] Configure email notifications as backup to SMS
- [ ] Set up automated appointment reminders
- [ ] Add Google Analytics or similar tracking
- [ ] Create privacy policy and terms of service