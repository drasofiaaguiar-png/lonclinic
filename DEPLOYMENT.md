# Railway Deployment Guide

This guide will help you deploy the Longevity Clinic application to Railway.

## Prerequisites

1. A [Railway account](https://railway.app/) (sign up for free)
2. Railway CLI installed (optional, but recommended)
3. Git repository connected to GitHub

## Quick Start

### 1. Create a New Project on Railway

1. Go to [railway.app](https://railway.app/)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose this repository: `drasofiaaguiar-png/lonclinic`

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create a `DATABASE_URL` environment variable

### 3. Configure Environment Variables

Go to your service's **"Variables"** tab and add all required variables from `.env.example`:

#### Required Variables

```bash
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CLINIC_USERNAME=admin
CLINIC_PASSWORD=<your-secure-password>

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (set up after deployment)

# Recommended
CLINICAL_ENCRYPTION_KEY=<generate another random string>
NODE_ENV=production
PUBLIC_SITE_URL=<your-railway-url or custom domain>
```

#### Email Configuration

Choose one method:

**Option A: SMTP (Gmail)**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=<your-app-password>
EMAIL_FROM=Longevity Clinic <noreply@yourdomain.com>
```

**Option B: Resend**
```bash
RESEND_API_KEY=re_...
```

### 4. Deploy

Railway will automatically deploy when you push to your main branch:

```bash
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

### 5. Set Up Stripe Webhook

After your first deployment:

1. Get your Railway app URL (e.g., `https://lonclinic-production.up.railway.app`)
2. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
3. Click **"Add endpoint"**
4. Enter: `https://your-railway-url.up.railway.app/stripe-webhook`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Copy the **Webhook signing secret** (starts with `whsec_`)
7. Add it to Railway as `STRIPE_WEBHOOK_SECRET`

### 6. Add Custom Domain (Optional)

1. In Railway project settings, go to **"Settings"** → **"Domains"**
2. Click **"Custom Domain"**
3. Add your domain and configure DNS records as instructed
4. Update `PUBLIC_SITE_URL` environment variable to your custom domain

## Generate Secure Keys

Use Node.js to generate secure random keys:

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CLINICAL_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring & Logs

- View logs in Railway dashboard under **"Deployments"**
- Monitor application health and metrics in the **"Metrics"** tab
- Set up alerts for deployment failures in project settings

## Troubleshooting

### Build Failures

If the build fails, check:
1. All required environment variables are set
2. PostgreSQL database is created and `DATABASE_URL` is available
3. Node.js version is compatible (Railway auto-detects from package.json)

### Runtime Errors

Check the logs for:
- Missing environment variables (the app will exit with clear error messages)
- Database connection issues
- Stripe configuration problems

### Database Migrations

If you need to run database migrations or seed data:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run commands on Railway
railway run node your-migration-script.js
```

## Production Checklist

- [ ] All required environment variables configured
- [ ] PostgreSQL database created and connected
- [ ] Stripe webhook configured
- [ ] Email service configured and tested
- [ ] `NODE_ENV=production` set
- [ ] Custom domain configured (if applicable)
- [ ] SSL/HTTPS enabled (automatic on Railway)
- [ ] Test payment flow end-to-end
- [ ] Test email notifications
- [ ] Monitor logs for errors

## Support

- Railway docs: https://docs.railway.app/
- Stripe docs: https://stripe.com/docs
- Project repository: https://github.com/drasofiaaguiar-png/lonclinic
