# Deployment Guide — Publishing Your Clinic Website

This guide will help you publish your website under a custom domain.

## Quick Start Options

### Option 1: Railway (Recommended — Easiest)
**Best for:** Quick deployment with minimal setup

1. **Sign up** at [railway.app](https://railway.app)
2. **Create a new project** → "Deploy from GitHub repo"
3. **Connect your GitHub** (push your code to GitHub first)
4. **Add environment variables:**
   - Copy all variables from `.env.example` to Railway's environment variables
   - Add your Stripe keys, email credentials, etc.
5. **Add custom domain:**
   - Go to Settings → Domains
   - Add your domain (e.g., `longevityclinic.com`)
   - Railway will provide DNS records to add
6. **Update DNS** at your domain registrar:
   - Add the CNAME record Railway provides
   - Wait 5-30 minutes for propagation

**Cost:** ~$5-20/month (pay-as-you-go)

---

### Option 2: Render
**Best for:** Free tier available, good for testing

1. **Sign up** at [render.com](https://render.com)
2. **Create a new Web Service**
3. **Connect your GitHub repo**
4. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add environment variables** (same as Railway)
6. **Add custom domain:**
   - Settings → Custom Domains → Add domain
   - Follow DNS instructions

**Cost:** Free tier available, $7/month for paid plan

---

### Option 3: Vercel (Requires adjustments)
**Best for:** If you want to use Vercel's edge network

**Note:** Vercel is optimized for serverless. You may need to adapt your Express app or use Vercel's serverless functions.

---

### Option 4: DigitalOcean App Platform
**Best for:** More control, predictable pricing

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)
2. **Create App** → Connect GitHub
3. **Configure build and start commands**
4. **Add environment variables**
5. **Add custom domain** in settings

**Cost:** ~$5-12/month

---

## Step-by-Step: Railway Deployment

### 1. Prepare Your Code

```bash
# Make sure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"
```

### 2. Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

### 3. Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect Node.js and deploy

### 4. Configure Environment Variables

In Railway dashboard → Variables tab, add:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Longevity Clinic <noreply@yourdomain.com>
DOXY_ROOM_URL=https://doxy.me/your-room
```

### 5. Add Custom Domain

1. In Railway → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `longevityclinic.com`)
4. Railway provides DNS records:
   - **CNAME**: `www` → `your-app.up.railway.app`
   - **A Record**: `@` → Railway's IP (if provided)

### 6. Configure DNS at Your Domain Registrar

Go to your domain registrar (Namecheap, GoDaddy, etc.) and add:

**For www subdomain:**
- Type: CNAME
- Name: www
- Value: `your-app.up.railway.app`

**For root domain (@):**
- Type: A (or ALIAS/CNAME flattening if supported)
- Value: Railway's IP or CNAME target

**Wait 5-30 minutes** for DNS propagation.

---

## Domain Registration

If you don't have a domain yet:

### Recommended Registrars:
- **Namecheap** — Good prices, easy DNS management
- **Cloudflare** — Free privacy, fast DNS
- **Google Domains** — Simple interface
- **GoDaddy** — Popular but more expensive

### Domain Suggestions:
- `longevityclinic.com`
- `longevityclinic.co.uk`
- `yourclinicname.com`

**Cost:** ~$10-15/year for `.com` domains

---

## Stripe Webhook Configuration

After deploying, configure Stripe webhooks:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter: `https://yourdomain.com/webhook`
4. Select events: `checkout.session.completed`, `checkout.session.expired`
5. Copy the webhook secret to your environment variables

---

## Email Configuration

### Gmail Setup:
1. Enable 2-Factor Authentication
2. Generate App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the app password (not your regular password) in `EMAIL_PASS`

### Alternative Email Services:
- **SendGrid** — Free tier: 100 emails/day
- **Mailgun** — Free tier: 5,000 emails/month
- **AWS SES** — Very cheap, pay per email

---

## Testing Your Deployment

1. Visit `https://yourdomain.com`
2. Test the booking flow
3. Check that emails are sent
4. Verify Stripe payments work
5. Test the patient dashboard

---

## SSL/HTTPS

All recommended platforms (Railway, Render, DigitalOcean) provide **free SSL certificates** automatically. Your site will be accessible via `https://` once the domain is connected.

---

## Troubleshooting

### Domain not working?
- Wait 30 minutes for DNS propagation
- Check DNS records with: `nslookup yourdomain.com`
- Verify CNAME/A records are correct

### Environment variables not working?
- Make sure they're set in your hosting platform
- Restart your app after adding variables
- Check for typos in variable names

### Stripe webhooks failing?
- Verify webhook URL is correct
- Check webhook secret matches
- View webhook logs in Stripe dashboard

---

## Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Render Docs: [render.com/docs](https://render.com/docs)
- Stripe Docs: [stripe.com/docs](https://stripe.com/docs)
