# Vercel Deployment Guide for AIShark

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/aishark)

## Manual Deployment Steps

### 1. Prerequisites
- Node.js 18+ installed
- Git repository
- Vercel account (free tier works)

### 2. Prepare Your Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - AIShark PCAP Analyzer"

# Push to GitHub
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 3. Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. Click "Deploy"

### 4. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production
vercel --prod
```

## Configuration

### Build Settings (Automatic)
```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Environment Variables
No environment variables are required. All processing is client-side.

## Vercel-Specific Optimizations

### 1. **Edge Runtime** (Optional)
The app runs entirely in the browser, so Edge runtime is not necessary.

### 2. **Static Assets**
All components are client-side rendered, optimized for Vercel's CDN.

### 3. **Memory Considerations**
- No serverless function memory limits apply
- Browser handles all processing
- IndexedDB for local caching

### 4. **Performance**
- Static generation for initial load
- Client-side hydration
- Web Workers for non-blocking parsing

## Monitoring

After deployment, you can monitor:
- **Analytics**: Vercel Analytics (optional)
- **Performance**: Web Vitals in Vercel dashboard
- **Errors**: Browser console (client-side only)

## Custom Domain

To add a custom domain:

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your domain
4. Update DNS records as instructed

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
vercel --force

# Check build logs
vercel logs <deployment-url>
```

### Client-Side Issues

- Check browser console for errors
- Ensure Web Workers are supported
- Verify IndexedDB is available

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

Configure in: Project Settings → Git

## Cost Considerations

**Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Global CDN

**This project fits perfectly in the free tier** because:
- No serverless functions
- No API routes with heavy processing
- Static Next.js pages with client-side logic

## Security

- Enable "Deployment Protection" in settings
- Use environment variable encryption (if needed later)
- Enable "Secure Compute" for sensitive deployments

## Performance Tips

1. **Lighthouse Score**: Run audits regularly
2. **Bundle Size**: Monitor with Vercel's bundle analyzer
3. **Web Workers**: Already implemented for performance
4. **Virtual Scrolling**: Handles large datasets efficiently

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build locally
npm run build

# Production preview
npm start

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Open project dashboard
vercel open
```

---

**Your AIShark deployment is ready! 🦈**
