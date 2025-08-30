# Sunday Tan Website - Deployment Guide

## Overview

This guide covers deploying the Sunday Tan website to production using:
- **Frontend**: Vercel (Next.js application)
- **Backend**: Railway (Express.js API)
- **Database**: MongoDB Atlas or Railway MongoDB
- **Services**: TextMagic SMS and Square Payments (both in test/sandbox mode)

## Prerequisites

1. GitHub account with repository access
2. Vercel account (free tier works)
3. Railway account
4. MongoDB Atlas account or Railway MongoDB addon
5. TextMagic account (for SMS - using test mode)
6. Square account (for payments - using sandbox mode)

## Repository Structure

```
sunday-tan-website/
├── client/              # Next.js frontend
│   ├── app/            # App router pages
│   ├── components/     # React components
│   └── package.json
├── server/             # Express.js backend
│   ├── routes/        # API routes
│   ├── models/        # Mongoose models
│   ├── services/      # External services
│   └── package.json
├── vercel.json        # Vercel configuration
├── railway.json       # Railway configuration
└── package.json       # Root package.json
```

## Step 1: Environment Setup

### 1.1 Create Environment Files

Copy the example files and configure them:

```bash
# For local development
cp .env.local.example .env.local
cp client/.env.local.example client/.env.local

# For production reference
cp .env.production.example .env.production
```

### 1.2 Generate Security Keys

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Admin Password Hash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## Step 2: Database Setup

### Option A: MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Add database user with read/write permissions
3. Whitelist Railway IPs (or allow all IPs for simplicity)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/sunday-tan`

### Option B: Railway MongoDB

1. Add MongoDB plugin in Railway dashboard
2. Copy the `MONGO_URL` from the plugin variables

## Step 3: Backend Deployment (Railway)

### 3.1 Connect GitHub Repository

1. Go to [Railway](https://railway.app)
2. Create new project → Deploy from GitHub repo
3. Select `lancef37/sunday-tan-website` repository
4. Railway will auto-detect the configuration

### 3.2 Configure Environment Variables

In Railway dashboard, add these variables:

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<your-generated-secret>
ADMIN_PASSWORD_HASH=<your-hashed-password>
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://sunday-tan-website.vercel.app

# TextMagic (Test Mode)
TEXTMAGIC_TEST_MODE=true
TEXTMAGIC_USERNAME=<your-username>
TEXTMAGIC_API_KEY=<your-api-key>
TEXTMAGIC_PHONE_NUMBER=+1234567890
ADMIN_PHONE=+1234567890

# Square (Sandbox Mode)
SQUARE_ENABLED=true
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=<sandbox-token>
SQUARE_LOCATION_ID=<sandbox-location>
```

### 3.3 Deploy Settings

Railway should automatically use these settings from `railway.json`:
- Build Command: `cd server && npm install`
- Start Command: `cd server && npm start`
- Health Check Path: `/api/health`

### 3.4 Get API URL

After deployment, Railway will provide a URL like:
`https://sunday-tan-website-production.up.railway.app`

## Step 4: Frontend Deployment (Vercel)

### 4.1 Import Project

1. Go to [Vercel](https://vercel.com)
2. Import Git Repository → Select `lancef37/sunday-tan-website`
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 4.2 Environment Variables

Add these in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://sunday-tan-website-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://sunday-tan-website.vercel.app
```

### 4.3 Deploy

Click "Deploy" and wait for the build to complete.

## Step 5: Post-Deployment Configuration

### 5.1 Update DNS (Optional)

If using a custom domain:
1. Add domain in Vercel settings
2. Update DNS records as instructed

### 5.2 Test the Deployment

#### Frontend Tests:
- [ ] Homepage loads: `https://sunday-tan-website.vercel.app`
- [ ] Navigation works
- [ ] Login/Register pages load
- [ ] Admin panel accessible

#### Backend Tests:
- [ ] API health check: `https://[railway-url]/api/health`
- [ ] CORS working (check browser console)
- [ ] Database connected (check Railway logs)

#### Integration Tests:
- [ ] User registration works
- [ ] Admin login works
- [ ] Booking flow completes
- [ ] SMS notifications (check logs for test mode)
- [ ] Square payments (sandbox mode)

## Step 6: Monitoring

### Railway Logs
```bash
# View logs in Railway dashboard or CLI
railway logs
```

### Vercel Logs
- Function logs in Vercel dashboard
- Build logs for deployment issues

## Switching to Production Mode

When ready to go live:

### 1. TextMagic (Real SMS)
```env
TEXTMAGIC_TEST_MODE=false
# Add real API credentials
```

### 2. Square (Real Payments)
```env
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=<production-token>
SQUARE_LOCATION_ID=<production-location>
```

### 3. Update Admin Password
Generate a strong password and update `ADMIN_PASSWORD_HASH`

## Troubleshooting

### CORS Issues
- Check `ALLOWED_ORIGINS` in Railway
- Verify frontend URL matches exactly
- Check browser console for errors

### Database Connection
- Verify MongoDB URI is correct
- Check IP whitelist in Atlas
- Review Railway logs for connection errors

### API Not Responding
- Check Railway deployment status
- Verify health endpoint: `/api/health`
- Review Railway logs

### SMS/Payment Issues
- Verify API keys are correct
- Check test mode settings
- Review server logs for errors

## Maintenance

### Updates
```bash
# Push updates to GitHub
git add .
git commit -m "Update message"
git push origin main

# Auto-deploys to Railway and Vercel
```

### Database Backup
- Use MongoDB Atlas backup feature
- Or export data using mongodump

### Logs
- Railway: 7-day retention (free tier)
- Vercel: Real-time function logs

## Security Checklist

- [ ] Strong JWT_SECRET generated
- [ ] Admin password properly hashed
- [ ] Environment variables never committed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced everywhere
- [ ] MongoDB connection secured
- [ ] Test modes clearly marked

## Support

For issues or questions:
1. Check deployment logs
2. Review environment variables
3. Verify service configurations
4. Test API endpoints directly

## Next Steps

1. Monitor application performance
2. Set up error tracking (Sentry)
3. Configure automated backups
4. Plan for scaling if needed
5. Document any custom configurations