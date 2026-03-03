# Next Steps — Complete Deployment Checklist

## ✅ Step 1: Push Code to GitHub (In Progress)

**Current Status:** Repository created, need to push code

**Action Required:**
1. Update the remote URL with your new repository:
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

2. Push your code:
   ```bash
   git push -u origin main
   ```

**Need help?** Share your GitHub repository URL and I'll run these commands for you.

---

## 📦 Step 2: Choose a Hosting Platform

### Recommended: Railway (Easiest)
- **Sign up:** [railway.app](https://railway.app)
- **Cost:** ~$5-20/month (pay-as-you-go)
- **Why:** Simplest setup, automatic deployments

### Alternative: Render (Free Tier Available)
- **Sign up:** [render.com](https://render.com)
- **Cost:** Free tier or $7/month
- **Why:** Good for testing, free option available

---

## 🚀 Step 3: Deploy to Hosting Platform

### If using Railway:
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize GitHub access
5. Select your repository
6. Railway will automatically deploy

### If using Render:
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your repository
5. Configure:
   - **Name:** longevity-clinic (or your choice)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click "Create Web Service"

---

## ⚙️ Step 4: Configure Environment Variables

Add these in your hosting platform's environment variables section:

**Required:**
- `STRIPE_SECRET_KEY` - From [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- `STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe Webhooks (after Step 6)

**Email (Optional but recommended):**
- `EMAIL_HOST` - `smtp.gmail.com` (for Gmail)
- `EMAIL_PORT` - `587`
- `EMAIL_USER` - Your Gmail address
- `EMAIL_PASS` - Gmail App Password ([Create here](https://myaccount.google.com/apppasswords))
- `EMAIL_FROM` - `Longevity Clinic <noreply@yourdomain.com>`

**Other:**
- `DOXY_ROOM_URL` - Your Doxy.me room URL (if using)
- `PORT` - Usually auto-set by platform

**See `ENV_SETUP.txt` for all variables**

---

## 🌐 Step 5: Connect Your Domain

### In Railway:
1. Go to your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `longevityclinic.com`)
4. Railway will show DNS records to add

### In Render:
1. Go to your service → **Settings** → **Custom Domains**
2. Click **"Add"**
3. Enter your domain
4. Follow DNS instructions

---

## 🔧 Step 6: Update DNS Records

Go to your domain registrar (where you bought the domain) and add:

**For Railway:**
- **Type:** CNAME
- **Name:** www
- **Value:** `your-app.up.railway.app` (Railway provides this)
- **TTL:** 3600

**For root domain (@):**
- **Type:** A
- **Name:** @ (or leave blank)
- **Value:** Railway's IP address (they provide this)

**For Render:**
- **Type:** CNAME
- **Name:** www
- **Value:** `your-app.onrender.com`

**Wait 5-30 minutes** for DNS to propagate.

---

## 🔐 Step 7: Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter: `https://yourdomain.com/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the **Webhook Secret**
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

---

## ✅ Step 8: Test Everything

1. Visit `https://yourdomain.com`
2. Test the booking flow
3. Verify Stripe payments work
4. Check that confirmation emails are sent
5. Test the patient dashboard

---

## 📋 Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Hosting platform account created
- [ ] Site deployed to hosting platform
- [ ] Environment variables configured
- [ ] Domain added in hosting platform
- [ ] DNS records updated at registrar
- [ ] SSL certificate active (automatic)
- [ ] Stripe webhooks configured
- [ ] Site tested and working

---

## 🆘 Need Help?

**Stuck on a step?** Let me know which step you're on and I'll help you through it!

**Common Issues:**
- **DNS not working?** Wait 30 minutes, check with [whatsmydns.net](https://www.whatsmydns.net)
- **Environment variables?** See `ENV_SETUP.txt`
- **Stripe setup?** Get keys from [dashboard.stripe.com](https://dashboard.stripe.com)
