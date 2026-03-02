# Connecting Your Existing Domain

Since you already have a domain, here's how to connect it to your deployed website.

## Quick Steps

### 1. Deploy Your Site First

Choose a hosting platform and deploy:

**Option A: Railway (Easiest)**
1. Push code to GitHub
2. Sign up at [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add environment variables (see ENV_SETUP.txt)

**Option B: Render**
1. Push code to GitHub
2. Sign up at [render.com](https://render.com)
3. New Web Service → Connect GitHub
4. Add environment variables

### 2. Get Your Deployment URL

After deploying, you'll get a URL like:
- Railway: `your-app.up.railway.app`
- Render: `your-app.onrender.com`

### 3. Add Custom Domain in Hosting Platform

**Railway:**
- Go to your project → Settings → Domains
- Click "Add Domain"
- Enter your domain (e.g., `longevityclinic.com`)
- Railway will show you DNS records to add

**Render:**
- Go to your service → Settings → Custom Domains
- Click "Add"
- Enter your domain
- Follow DNS instructions

### 4. Configure DNS at Your Domain Registrar

Go to where you bought your domain (Namecheap, GoDaddy, Cloudflare, etc.) and add DNS records:

#### For Railway:
**Option 1: CNAME for www subdomain**
- Type: `CNAME`
- Name: `www`
- Value: `your-app.up.railway.app`
- TTL: 3600 (or default)

**Option 2: A Record for root domain (@)**
- Type: `A`
- Name: `@` (or leave blank)
- Value: Railway's IP address (they'll provide this)
- TTL: 3600

#### For Render:
- Type: `CNAME`
- Name: `www` (or `@` if your registrar supports CNAME flattening)
- Value: `your-app.onrender.com`
- TTL: 3600

### 5. Wait for DNS Propagation

- Usually takes 5-30 minutes
- Can take up to 48 hours (rare)
- Check status: `nslookup yourdomain.com` or use [whatsmydns.net](https://www.whatsmydns.net)

### 6. SSL Certificate

Most platforms automatically provision SSL certificates once DNS is configured. Your site will be accessible via `https://yourdomain.com` automatically.

---

## Common Domain Registrars - Where to Find DNS Settings

### Namecheap
1. Log in → Domain List
2. Click "Manage" next to your domain
3. Go to "Advanced DNS" tab
4. Add records there

### GoDaddy
1. Log in → My Products
2. Click "DNS" next to your domain
3. Add records in DNS Management

### Cloudflare
1. Log in → Select your domain
2. Go to "DNS" → "Records"
3. Add records there

### Google Domains
1. Log in → My Domains
2. Click your domain → DNS
3. Add records in "Custom resource records"

---

## DNS Record Examples

### Example 1: www subdomain only
```
Type: CNAME
Name: www
Value: your-app.up.railway.app
TTL: 3600
```

### Example 2: Both www and root domain
```
Record 1:
Type: CNAME
Name: www
Value: your-app.up.railway.app

Record 2:
Type: A
Name: @
Value: [Railway's IP address]
```

### Example 3: Using Cloudflare (CNAME flattening)
```
Type: CNAME
Name: @
Value: your-app.up.railway.app
(Cloudflare automatically handles this)
```

---

## Troubleshooting

### Domain not working after 30 minutes?
1. **Check DNS propagation:**
   - Visit [whatsmydns.net](https://www.whatsmydns.net)
   - Enter your domain
   - See if DNS records are propagated globally

2. **Verify DNS records:**
   ```bash
   # In terminal/command prompt
   nslookup yourdomain.com
   nslookup www.yourdomain.com
   ```

3. **Check hosting platform:**
   - Make sure domain is added in Railway/Render dashboard
   - Verify SSL certificate is being provisioned
   - Check deployment logs for errors

### Getting SSL errors?
- Wait a few more minutes (SSL provisioning can take 5-10 minutes after DNS)
- Make sure DNS is fully propagated
- Check that your hosting platform shows the domain as "Active"

### Domain shows "Not configured"?
- Double-check DNS records match exactly what the platform provided
- Ensure TTL is set (don't leave blank)
- Try removing and re-adding the domain in your hosting platform

---

## Need Help?

**What's your domain registrar?** I can provide specific instructions for:
- Namecheap
- GoDaddy
- Cloudflare
- Google Domains
- Others

**What hosting platform are you using?** I can help with:
- Railway
- Render
- DigitalOcean
- Others
