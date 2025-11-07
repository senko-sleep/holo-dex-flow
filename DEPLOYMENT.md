# Deployment Guide - Holo Dex Flow

This guide covers multiple deployment options for your anime/manga web application.

---

## 🚀 Quick Deploy Options

### Option 1: Netlify (Recommended)
**Easiest and fastest deployment**

#### Steps:
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account
4. Select the `holo-dex-flow` repository
5. Netlify will auto-detect settings from `netlify.toml`
6. Click "Deploy site"

**Configuration**: Already set up in `netlify.toml`
- Build command: `npm run build`
- Publish directory: `dist`
- Auto-deploys on push to main branch

**Your site will be live at**: `https://your-site-name.netlify.app`

---

### Option 2: Vercel
**Great for React/Vite projects**

#### Steps:
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite settings
5. Click "Deploy"

**Configuration**: Already set up in `vercel.json`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

**Your site will be live at**: `https://your-site-name.vercel.app`

---

### Option 3: GitHub Pages
**Free hosting on GitHub**

#### Steps:
1. Go to your GitHub repository settings
2. Navigate to "Pages" section
3. Under "Build and deployment":
   - Source: "GitHub Actions"
4. Push to main branch to trigger deployment

**Configuration**: Already set up in `.github/workflows/deploy.yml`
- Automatic deployment on push
- Uses GitHub Actions

**Your site will be live at**: `https://senko-sleep.github.io/holo-dex-flow/`

**Note**: If using GitHub Pages, update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/holo-dex-flow/', // Add this line
  // ... rest of config
})
```

---

### Option 4: Cloudflare Pages

#### Steps:
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
5. Click "Save and Deploy"

**Your site will be live at**: `https://your-site-name.pages.dev`

---

## 📋 Configuration Files

### `netlify.toml`
- Netlify-specific configuration
- Includes redirects for SPA routing
- Security headers
- Cache optimization

### `vercel.json`
- Vercel-specific configuration
- SPA rewrites
- Security headers
- Environment variables

### `.github/workflows/deploy.yml`
- GitHub Actions workflow
- Automated deployment to GitHub Pages
- Runs on push to main branch

---

## 🔧 Build Settings

All platforms use the same build configuration:

```json
{
  "build": {
    "command": "npm run build",
    "output": "dist",
    "node_version": "20.17.0"
  }
}
```

---

## 🌐 Custom Domain Setup

### Netlify
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS configuration instructions

### Vercel
1. Go to Project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### GitHub Pages
1. Go to Repository settings → Pages
2. Add custom domain under "Custom domain"
3. Configure DNS with CNAME record

---

## 🔒 Environment Variables

If you need API keys or environment variables:

### Netlify
1. Site settings → Environment variables
2. Add variables (e.g., `VITE_API_KEY`)

### Vercel
1. Project settings → Environment Variables
2. Add variables for Production/Preview/Development

### GitHub Pages
1. Repository settings → Secrets and variables → Actions
2. Add repository secrets

---

## 📊 Performance Optimization

All configurations include:
- ✅ Asset caching (1 year for immutable files)
- ✅ Security headers (XSS, frame options, etc.)
- ✅ SPA routing (all routes redirect to index.html)
- ✅ Gzip/Brotli compression
- ✅ CDN distribution

---

## 🚨 Important Notes

### API Rate Limits
Your app uses:
- **Jikan API** (MyAnimeList data) - Rate limited
- **MangaDex API** - Rate limited
- **AnimeThemes API** - Rate limited

Consider implementing:
- Request caching (already implemented)
- Rate limit handling (already implemented)
- Error boundaries (already implemented)

### CORS Issues
If you encounter CORS errors in production:
1. APIs are configured to allow browser requests
2. No backend proxy needed
3. All API calls are client-side

### Build Size
Current build size:
- CSS: ~67 KB (11 KB gzipped)
- JS: ~482 KB (148 KB gzipped)
- Total: ~549 KB (159 KB gzipped)

---

## 🎯 Recommended: Netlify

**Why Netlify?**
- ✅ Easiest setup
- ✅ Auto-deploys from GitHub
- ✅ Free SSL certificate
- ✅ CDN included
- ✅ Great performance
- ✅ Generous free tier
- ✅ Automatic preview deployments
- ✅ Built-in form handling
- ✅ Serverless functions support

---

## 📝 Deployment Checklist

Before deploying:
- [x] Build succeeds locally (`npm run build`)
- [x] No console errors
- [x] All routes work
- [x] Images load correctly
- [x] API calls work
- [x] Mobile responsive
- [x] Configuration files created
- [ ] Choose hosting platform
- [ ] Deploy!

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Routes Don't Work (404 on refresh)
- Check SPA redirect configuration
- Netlify: `netlify.toml` has redirects
- Vercel: `vercel.json` has rewrites
- GitHub Pages: May need hash routing

### API Errors in Production
- Check browser console for CORS errors
- Verify API endpoints are accessible
- Check rate limits
- Ensure caching is working

---

## 📞 Support

If you encounter issues:
1. Check build logs on your hosting platform
2. Verify all configuration files are committed
3. Test locally with `npm run build && npm run preview`
4. Check hosting platform documentation

---

## 🎉 After Deployment

Your site will be live with:
- ✅ Anime search and details
- ✅ Manga search and reading
- ✅ Character information
- ✅ Leaderboards
- ✅ Music player
- ✅ Content warnings
- ✅ Seasonal anime
- ✅ Top rated content
- ✅ Beautiful UI
- ✅ Mobile responsive

**Share your site**: `https://your-site-name.netlify.app`

---

**Status**: Ready to Deploy! 🚀  
**Recommended Platform**: Netlify  
**Estimated Deploy Time**: 2-3 minutes
