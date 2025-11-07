# 🚀 Quick Deploy Guide

## Fastest Way to Deploy (2 minutes)

### Deploy to Netlify (Recommended)

1. **Go to Netlify**
   - Visit: https://app.netlify.com/start
   - Click "Add new site" → "Import an existing project"

2. **Connect GitHub**
   - Authorize Netlify to access your GitHub
   - Select repository: `senko-sleep/holo-dex-flow`

3. **Deploy**
   - Netlify auto-detects settings from `netlify.toml`
   - Click "Deploy site"
   - Wait 2-3 minutes

4. **Done!**
   - Your site is live at: `https://[random-name].netlify.app`
   - You can change the name in Site settings

---

## What's Already Configured

✅ **Build Settings**
- Command: `npm run build`
- Output: `dist` folder
- Node version: 20.17.0

✅ **SPA Routing**
- All routes redirect to index.html
- No 404 errors on page refresh

✅ **Performance**
- Asset caching (1 year)
- Gzip compression
- CDN distribution

✅ **Security**
- Security headers configured
- XSS protection
- Frame protection

---

## Configuration Files Created

1. **`netlify.toml`** - Netlify configuration
2. **`vercel.json`** - Vercel configuration  
3. **`.github/workflows/deploy.yml`** - GitHub Pages workflow
4. **`public/_redirects`** - Backup SPA redirects
5. **`.env.example`** - Environment variables template

---

## Alternative Platforms

### Vercel
1. Go to https://vercel.com/new
2. Import `senko-sleep/holo-dex-flow`
3. Click Deploy

### GitHub Pages
1. Go to repo Settings → Pages
2. Source: GitHub Actions
3. Push to main branch

### Cloudflare Pages
1. Go to https://pages.cloudflare.com
2. Create project from GitHub
3. Build: `npm run build`, Output: `dist`

---

## After Deployment

Your live site will have:
- ✅ Anime search & details
- ✅ Manga reading
- ✅ Character info
- ✅ Leaderboards
- ✅ Music player
- ✅ Seasonal anime
- ✅ Content warnings
- ✅ Beautiful UI

---

## Need Help?

See full guide: `DEPLOYMENT.md`

**Recommended**: Use Netlify for easiest setup! 🎉
