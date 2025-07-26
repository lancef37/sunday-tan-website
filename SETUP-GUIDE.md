# 🚀 Complete Setup Guide for Sunday Tan Website

**For first-time website builders - Step by step instructions**

## Part 1: Installing Required Software

### 1. Install Node.js
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (recommended)
3. Run the installer and follow the prompts
4. To verify installation, open Command Prompt and type: `node --version`

### 2. Install MongoDB (Choose ONE option)

**Option A: Local Installation (Simpler for beginners)**
1. Go to [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Download MongoDB Community Server
3. Install with default settings
4. MongoDB will start automatically

**Option B: Cloud Database (Recommended for production)**
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string

## Part 2: Setting Up Your Website

### 1. Open Command Prompt/Terminal
- Windows: Press `Win + R`, type `cmd`, press Enter
- Mac: Press `Cmd + Space`, type `terminal`, press Enter

### 2. Navigate to Your Project
```bash
cd "C:\Users\lfrazer\Desktop\Sunday Tan Website"
```

### 3. Install All Dependencies
```bash
npm run install:all
```
*This will take a few minutes to download everything*

### 4. Create Your Environment File
1. Find the file named `.env.example` in your project folder
2. Copy it and rename the copy to `.env`
3. Open `.env` in Notepad and fill in your information:

```env
# Basic Settings (Required)
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/sunday-tan

# Security (Required)
JWT_SECRET=sunday-tan-super-secret-key-2024
ADMIN_PASSWORD_HASH=[We'll generate this in the next step]

# Your Phone Number (Required)
ADMIN_PHONE=+15551234567

# Payment Settings (Optional for now)
SQUARE_ENABLED=false
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox

# SMS Settings (Optional for now)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 5. Generate Your Admin Password
**First, navigate to the server folder and generate your password hash:**
1. Choose a password for the admin area (write it down!)
2. In Command Prompt, run these commands:
```bash
cd server
node -e "console.log(require('bcryptjs').hashSync('YourPassword', 10))"
cd ..
```
(Replace 'YourPassword' with your chosen password)
3. Copy the long string that appears
4. Paste it as the value for `ADMIN_PASSWORD_HASH` in your `.env` file

### 6. Start Your Website
```bash
npm run dev
```

You should see messages like:
```
Server running on port 5000
Connected to MongoDB
ready - started server on 0.0.0.0:3000
```

### 7. Test Your Website
1. Open your web browser
2. Go to `http://localhost:3000`
3. You should see your Sunday Tan website!
4. Test the admin area at `http://localhost:3000/admin`

## Part 3: Setting Up Payments (Square)

### 1. Create Square Account
1. Go to [https://squareup.com](https://squareup.com)
2. Sign up for a free account
3. Complete the verification process

### 2. Get Your Square Credentials
1. Go to [https://developer.squareup.com](https://developer.squareup.com)
2. Sign in with your Square account
3. Create a new application
4. From the dashboard, copy:
   - **Access Token** (Sandbox)
   - **Location ID**

### 3. Update Your .env File
```env
SQUARE_ENABLED=true
SQUARE_ACCESS_TOKEN=your-access-token-here
SQUARE_LOCATION_ID=your-location-id-here
SQUARE_ENVIRONMENT=sandbox
```

### 4. Test Payments
1. Restart your website (`Ctrl+C` then `npm run dev`)
2. Try making a test booking
3. Use Square's test card numbers for testing

## Part 4: Setting Up Text Messages (Twilio)

### 1. Create Twilio Account
1. Go to [https://twilio.com](https://twilio.com)
2. Sign up for a free account ($15-20 free credits)
3. Verify your phone number

### 2. Get Your Twilio Credentials
1. From your Twilio Console, copy:
   - **Account SID**
   - **Auth Token**
2. Get a Twilio phone number (free with trial)

### 3. Update Your .env File
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567
ADMIN_PHONE=+15559876543
```

### 4. Test SMS
1. Restart your website
2. Make a test booking
3. You should receive a text message!

## Part 5: Going Live (Deployment)

### Easy Option: Vercel (Free)
1. Create account at [https://vercel.com](https://vercel.com)
2. Connect your GitHub account
3. Upload your code to GitHub
4. Deploy with one click
5. Add your environment variables in Vercel dashboard

### For the Database:
1. Use MongoDB Atlas (cloud database)
2. Update your `MONGODB_URI` in production

## 🆘 Troubleshooting

### "Command not found" errors
- Make sure Node.js is installed correctly
- Restart your Command Prompt

### "Cannot connect to MongoDB"
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env`

### Website won't start
- Make sure you're in the right folder
- Check for typos in your `.env` file
- Try `npm run install:all` again

### Payments not working
- Make sure `SQUARE_ENABLED=true`
- Verify your Square credentials
- Check you're using sandbox mode for testing

### Text messages not sending
- Verify your Twilio credentials
- Make sure phone numbers include country code (+1 for US)
- Check your Twilio account balance

## 📞 Getting Help

If you get stuck:
1. Check the error messages in Command Prompt
2. Google the specific error message
3. Make sure all your `.env` values are correct
4. Try restarting the website

## 🎉 Next Steps

Once everything is working:
1. Customize the colors and text to match your brand
2. Add your business information
3. Test the entire booking flow
4. Set up your domain name
5. Deploy to production
6. Start taking real bookings!

**Congratulations! You've built your first website! 🎊**