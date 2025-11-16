# 🚀 FPBE Bank - Deployment Guide

## Quick Deploy to Vercel

1. **Click "Publish" button** in the top-right corner of v0
2. Follow the prompts to connect your Vercel account
3. Your app will be live in minutes!

## Manual Deployment

### Prerequisites
- Vercel account (free tier works)
- Pi Network Developer account
- Your Pi App credentials

### Step 1: Get Pi Network Credentials

1. Go to [Pi Developer Portal](https://develop.pi)
2. Create a new app or use existing
3. Note your:
   - App ID
   - API Key
   - Sandbox mode setting

### Step 2: Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and add environment variables when asked
\`\`\`

### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

\`\`\`
NEXT_PUBLIC_PI_APP_ID=your_app_id_here
NEXT_PUBLIC_PI_SANDBOX=false
\`\`\`

### Step 4: Configure Pi App Settings

In Pi Developer Portal:
1. Add your Vercel domain to allowed domains
2. Set payment callback URLs:
   - Approval: `https://your-domain.vercel.app/api/pi/approve`
   - Completion: `https://your-domain.vercel.app/api/pi/complete`

## Admin Access

Admin user is automatically configured:
- Username: `AAMS1969`
- Wallet: `GDIW2DXDR3DU4CYTRHDS3WYDGHMUQZG7E5FJWWW6XSADOC5VHMYRYD6F`
- No payment required for admin

## Features Live

✅ Pi Network authentication
✅ 1 Pi payment gate for all users (except admin)
✅ Admin dashboard with system monitoring
✅ Persistent sessions (no re-login needed)
✅ Invitation code system (AAMS1969)
✅ Full banking features
✅ Land acquisition tracking
✅ TEOS token integration
✅ Verified contributor system

## Support

Need help? The app is ready to go live NOW. Just click Publish!

For Pi Network SDK issues, check: https://developers.minepi.com
