# MedSync Pharmacy Portal - Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

- [x] Next.js 15.5.9 (Security patch applied)
- [x] All dependencies updated
- [x] Google Maps API integration
- [x] Address autocomplete feature
- [x] Environment variables documented
- [x] Git repository ready

---

## 🚀 Step 1: Push to GitHub

```bash
cd /Users/adisa/Desktop/DEV/embrion/MedsyncProject/medsync-pharmacy

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: production-ready deployment with address autocomplete and security patches

- Upgrade Next.js to 15.5.9 (CVE-2025-66478 patch)
- Add Google Places address autocomplete
- Implement real-time address validation
- Add password strength indicator
- Enhance admin verification dashboard
- Improve chat and order management
- Add geocoding service with fallback
- Update API error handling
- Clean up legacy documentation (5,233 lines)
- Add comprehensive environment configuration"

# Push to GitHub
git push origin main
```

---

## 🌐 Step 2: Vercel Setup

### A. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose: `EMBRION-TECHNOLOGIES/medsync-pharmacy`
5. Click **"Import"**

### B. Configure Project Settings

**Framework Preset:** Next.js  
**Root Directory:** `./` (leave as default)  
**Build Command:** `npm run build` (auto-detected)  
**Output Directory:** `.next` (auto-detected)  
**Install Command:** `npm install` (auto-detected)

---

## 🔐 Step 3: Environment Variables

### Required Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

#### 1. API Configuration (CRITICAL)

```bash
# Production Backend URL (Railway)
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.railway.app/api/v1
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
```

**⚠️ IMPORTANT:** Replace with your actual Railway backend URL

#### 2. Socket Configuration

```bash
NEXT_PUBLIC_SOCKET_NAMESPACE=/patient-pharmacy
NEXT_PUBLIC_ENABLE_LEGACY_EVENTS=false
```

#### 3. Google Maps API (REQUIRED)

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCnlckYXO-EugYoiDcTQGabsyfP2Ar3O70
```

**✅ This is your existing API key from .env.local**

**API Requirements:**
- Enable **Places API** (for autocomplete)
- Enable **Geocoding API** (for coordinate extraction)
- Set up billing (required for production use)
- Add domain restrictions in Google Cloud Console

#### 4. Environment

```bash
NODE_ENV=production
```

---

## 📝 Step 4: Environment Variable Configuration in Vercel

### How to Add Environment Variables:

1. In Vercel Dashboard, go to your project
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in sidebar
4. For each variable:
   - **Key:** Variable name (e.g., `NEXT_PUBLIC_API_BASE_URL`)
   - **Value:** Variable value
   - **Environments:** Select **Production**, **Preview**, and **Development**
5. Click **"Save"**

### Environment-Specific Values:

#### Production Environment:
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-production-backend.railway.app/api/v1
NEXT_PUBLIC_SOCKET_URL=https://your-production-backend.railway.app
NODE_ENV=production
```

#### Preview Environment (Optional):
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-staging-backend.railway.app/api/v1
NEXT_PUBLIC_SOCKET_URL=https://your-staging-backend.railway.app
NODE_ENV=development
```

---

## 🔧 Step 5: Build Settings (Optional Optimization)

### Advanced Build Configuration

In Vercel Dashboard → Project Settings → General:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Environment Variables for Build Optimization:

```bash
# Optional: Increase Node.js memory for large builds
NODE_OPTIONS=--max-old-space-size=4096

# Optional: Enable Next.js telemetry
NEXT_TELEMETRY_DISABLED=0
```

---

## 🚀 Step 6: Deploy

### Automatic Deployment (Recommended)

1. Once environment variables are set, click **"Deploy"**
2. Vercel will automatically:
   - Clone the repository
   - Install dependencies
   - Run build process
   - Deploy to production

### Manual Deployment (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## ✅ Step 7: Post-Deployment Verification

### 1. Check Deployment Status
- Go to Vercel Dashboard → Deployments
- Ensure build completed successfully (green checkmark)
- Click on deployment to view logs

### 2. Test Critical Features

#### A. Signup Flow with Address Autocomplete
1. Go to: `https://your-app.vercel.app/signup`
2. Fill in pharmacy details
3. Test address autocomplete:
   - Start typing an address
   - Verify Google Places suggestions appear
   - Click a suggestion
   - Verify address autofills with coordinates
4. Complete signup

#### B. Login
1. Go to: `https://your-app.vercel.app/login`
2. Login with test credentials
3. Verify redirect to dashboard

#### C. Dashboard
1. Verify dashboard loads
2. Check order list
3. Test navigation

#### D. Admin Verification (if admin)
1. Go to: `https://your-app.vercel.app/admin/verification`
2. Verify pharmacy list loads
3. Test approval workflow

### 3. Check Browser Console
- Open Developer Tools (F12)
- Check for errors in Console tab
- Verify API calls are hitting correct backend URL
- Check Network tab for failed requests

### 4. Test API Connectivity

```bash
# Test backend connectivity
curl https://your-app.vercel.app/api/health

# Check environment variables (in browser console)
console.log(process.env.NEXT_PUBLIC_API_BASE_URL)
console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
```

---

## 🔍 Troubleshooting

### Issue 1: Build Fails

**Error:** `Module not found` or `Cannot find module`

**Solution:**
```bash
# Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push
```

### Issue 2: Environment Variables Not Working

**Error:** `process.env.NEXT_PUBLIC_API_BASE_URL is undefined`

**Solution:**
1. Verify variables are prefixed with `NEXT_PUBLIC_`
2. Redeploy after adding variables:
   - Vercel Dashboard → Deployments → ⋯ → Redeploy

### Issue 3: Address Autocomplete Not Working

**Error:** Google Maps API errors in console

**Solution:**
1. Verify API key is correct in Vercel environment variables
2. Check Google Cloud Console:
   - Places API is enabled
   - Geocoding API is enabled
   - Billing is set up
   - API key restrictions allow your Vercel domain
3. Add your Vercel domain to API key restrictions:
   - `*.vercel.app`
   - Your custom domain (if any)

### Issue 4: CORS Errors

**Error:** `Access-Control-Allow-Origin` errors

**Solution:**
1. Update backend CORS settings to allow Vercel domain
2. In backend `.env`:
   ```bash
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGIN=https://your-app.vercel.app
   ```

### Issue 5: Socket Connection Fails

**Error:** WebSocket connection errors

**Solution:**
1. Verify `NEXT_PUBLIC_SOCKET_URL` is correct
2. Ensure backend supports WebSocket connections
3. Check Railway/backend logs for connection attempts

---

## 🌍 Step 8: Custom Domain (Optional)

### Add Custom Domain

1. In Vercel Dashboard → Project Settings → Domains
2. Click **"Add Domain"**
3. Enter your domain: `pharmacy.medsync.ng`
4. Follow DNS configuration instructions
5. Add DNS records:
   ```
   Type: A
   Name: pharmacy (or @)
   Value: 76.76.21.21 (Vercel IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Update Environment Variables for Custom Domain

```bash
# Add custom domain to Google Maps API restrictions
# In Google Cloud Console → APIs & Services → Credentials
# Add: pharmacy.medsync.ng
```

---

## 📊 Step 9: Monitoring & Analytics

### Enable Vercel Analytics

1. Vercel Dashboard → Project → Analytics
2. Enable **Web Analytics**
3. Enable **Speed Insights**

### Monitor Logs

```bash
# View deployment logs
vercel logs

# View production logs
vercel logs --prod

# Follow logs in real-time
vercel logs --follow
```

---

## 🔄 Step 10: CI/CD Pipeline

### Automatic Deployments

Vercel automatically deploys on:
- ✅ Push to `main` branch → Production
- ✅ Push to other branches → Preview deployment
- ✅ Pull requests → Preview deployment with unique URL

### Branch Deployment Strategy

```bash
# Production (main branch)
main → https://your-app.vercel.app

# Staging (develop branch)
develop → https://your-app-git-develop.vercel.app

# Feature branches
feature/new-feature → https://your-app-git-feature-new-feature.vercel.app
```

### Deployment Protection (Optional)

1. Vercel Dashboard → Project Settings → Git
2. Enable **"Deployment Protection"**
3. Require approval for production deployments

---

## 🔐 Security Checklist

### Before Going Live:

- [ ] All environment variables set correctly
- [ ] Google Maps API key has domain restrictions
- [ ] Backend CORS allows Vercel domain
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] No sensitive data in client-side code
- [ ] API keys not exposed in browser
- [ ] Rate limiting enabled on backend
- [ ] Error messages don't expose sensitive info

---

## 📱 Step 11: Test on Mobile Devices

### Responsive Testing

1. Open Vercel deployment URL on mobile
2. Test signup flow on mobile browser
3. Verify address autocomplete works on mobile
4. Test all critical features

### Browser Compatibility

Test on:
- ✅ Chrome (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox
- ✅ Edge

---

## 🎯 Success Criteria

### Deployment is successful when:

- ✅ Build completes without errors
- ✅ Application loads at Vercel URL
- ✅ Signup flow works with address autocomplete
- ✅ Login redirects to dashboard
- ✅ API calls reach backend successfully
- ✅ No console errors
- ✅ Google Maps autocomplete works
- ✅ Socket connections establish
- ✅ All pages load correctly

---

## 📞 Support & Resources

### Vercel Documentation
- [Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/domains)

### MedSync Resources
- **Backend URL:** Check Railway deployment
- **API Documentation:** Backend `/docs` endpoint
- **Google Maps Setup:** [Google Cloud Console](https://console.cloud.google.com)

### Emergency Rollback

```bash
# Rollback to previous deployment
vercel rollback
```

Or in Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click ⋯ → Promote to Production

---

## 🎉 Deployment Complete!

Once deployed, your pharmacy portal will be live at:
- **Production:** `https://your-app.vercel.app`
- **Custom Domain:** `https://pharmacy.medsync.ng` (if configured)

### Next Steps:

1. ✅ Test all features thoroughly
2. ✅ Monitor logs for errors
3. ✅ Share URL with team for testing
4. ✅ Deploy backend to Railway (if not already)
5. ✅ Deploy mobile app to app stores

---

**Document Version:** 1.0  
**Last Updated:** December 26, 2025  
**Deployment Status:** Ready for Production

