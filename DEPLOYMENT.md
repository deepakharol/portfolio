# Portfolio Deployment Guide for Cloudflare

## Overview
This guide provides step-by-step instructions for deploying your portfolio website to Cloudflare using your domain (deepakkharol.com).

## Prerequisites
- Cloudflare account with your domain registered
- GitHub account (for Cloudflare Pages)
- Node.js and npm installed locally
- Java 11+ (for backend, optional)

## Deployment Options

### Option 1: Cloudflare Pages (Recommended for Frontend)

#### Step 1: Prepare Your Repository
1. Create a new GitHub repository for your portfolio
2. Push your frontend code to the repository:
```bash
cd /Users/deepakkharol/IdeaProjects/portfolio
git init
git add .
git commit -m "Initial portfolio commit"
git remote add origin https://github.com/yourusername/portfolio.git
git push -u origin main
```

#### Step 2: Set Up Cloudflare Pages
1. Log in to Cloudflare Dashboard
2. Go to "Pages" in the sidebar
3. Click "Create a project"
4. Connect your GitHub account
5. Select your portfolio repository
6. Configure build settings:
   - Build command: (leave empty for static site)
   - Build output directory: `/`
   - Root directory: `/`

#### Step 3: Environment Variables
Add any needed environment variables in Cloudflare Pages settings:
- `API_BASE_URL`: Your backend API URL (if deployed separately)

#### Step 4: Custom Domain
1. In your Pages project settings, go to "Custom domains"
2. Add `deepakkharol.com` and `www.deepakkharol.com`
3. Cloudflare will automatically configure DNS

### Option 2: Cloudflare Workers (For Static Sites)

#### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

#### Step 2: Create wrangler.toml
Create a `wrangler.toml` file in your project root:
```toml
name = "portfolio"
main = "worker.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[[routes]]
pattern = "deepakkharol.com/*"
zone_name = "deepakkharol.com"

[[routes]]
pattern = "www.deepakkharol.com/*"
zone_name = "deepakkharol.com"
```

#### Step 3: Create Worker Script
Create `worker.js`:
```javascript
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  try {
    return await getAssetFromKV(event);
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}
```

#### Step 4: Deploy
```bash
wrangler login
wrangler publish
```

## Backend Deployment Options

### Option 1: Deploy Backend on Cloud Platform

#### Using Heroku (Free Alternative)
1. Create a `system.properties` file:
```
java.runtime.version=11
```

2. Create a `Procfile`:
```
web: java -jar target/portfolio-api-0.0.1-SNAPSHOT.jar
```

3. Deploy to Heroku:
```bash
cd backend/portfolio-api
heroku create your-portfolio-api
git push heroku main
```

#### Using Railway.app (Recommended)
1. Connect your GitHub repository to Railway
2. Add MongoDB plugin if needed
3. Deploy with one click
4. Get your API URL and update frontend

### Option 2: Serverless Backend with Cloudflare Workers

Create a serverless API using Cloudflare Workers:

1. Create `api-worker.js`:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Route handling
  if (url.pathname === '/api/projects' && request.method === 'GET') {
    const projects = [
      {
        id: '1',
        title: 'Campaign API System',
        description: 'RESTful API for programmatic campaign creation',
        technologies: ['Java', 'Spring Boot', 'Redis', 'MongoDB'],
        featured: true
      },
      // Add more projects
    ];
    return new Response(JSON.stringify(projects), { headers });
  }

  if (url.pathname === '/api/contact' && request.method === 'POST') {
    const body = await request.json();
    // Here you could send email or save to a database
    console.log('Contact form submission:', body);
    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response('Not found', { status: 404, headers });
}
```

2. Deploy the worker:
```bash
wrangler publish api-worker.js --name portfolio-api
```

## Local Testing Before Deployment

### Test Frontend
```bash
# Using http-server
npm install -g http-server
cd /Users/deepakkharol/IdeaProjects/portfolio
http-server -p 8000

# Or using Python
python3 -m http.server 8000
```

### Test Backend (Optional)
```bash
cd backend/portfolio-api
./mvnw spring-boot:run
```

### Test Full Stack
1. Start backend on port 8080
2. Start frontend on port 8000
3. Visit http://localhost:8000

## Production Checklist

### Before Deployment
- [ ] Minify CSS and JavaScript files
- [ ] Optimize images (use WebP format)
- [ ] Update API URLs to production endpoints
- [ ] Test all forms and interactions
- [ ] Check mobile responsiveness
- [ ] Verify Tetris game works
- [ ] Test contact form submission

### Security
- [ ] Enable HTTPS (automatic with Cloudflare)
- [ ] Set up rate limiting for API
- [ ] Configure CORS properly
- [ ] Remove debug logs
- [ ] Validate all user inputs

### Performance
- [ ] Enable Cloudflare caching
- [ ] Set up page rules for static assets
- [ ] Enable Auto Minify in Cloudflare
- [ ] Enable Brotli compression

## Cloudflare Configuration

### DNS Settings
1. Ensure your domain points to Cloudflare nameservers
2. Set up A record or CNAME for root domain
3. Set up CNAME for www subdomain

### Page Rules
Create these page rules for better performance:

1. `*deepakkharol.com/assets/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

2. `*deepakkharol.com/api/*`
   - Cache Level: Bypass
   - Security Level: High

### SSL/TLS
1. Set SSL/TLS encryption mode to "Full (strict)"
2. Enable "Always Use HTTPS"
3. Enable "Automatic HTTPS Rewrites"

## Monitoring and Analytics

### Cloudflare Analytics
- Monitor traffic and performance
- Check Web Vitals scores
- Review security events

### Add Google Analytics
Add to your `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA-ID');
</script>
```

## Troubleshooting

### Common Issues

1. **404 Errors**: Check your routing and file paths
2. **CORS Issues**: Verify allowed origins in backend and Cloudflare
3. **API Not Working**: Check API URL in frontend configuration
4. **Slow Loading**: Enable Cloudflare caching and optimization

### Debug Steps
1. Check Cloudflare dashboard for errors
2. Use browser DevTools Network tab
3. Check Cloudflare Workers logs (if using Workers)
4. Verify DNS propagation

## Maintenance

### Regular Updates
- Update dependencies monthly
- Review and update content
- Check for security vulnerabilities
- Monitor performance metrics

### Backup Strategy
- Keep GitHub repository as source of truth
- Regular exports of any database data
- Document all configuration changes

## Contact Support

If you encounter issues:
1. Check Cloudflare Status: https://www.cloudflarestatus.com/
2. Cloudflare Community: https://community.cloudflare.com/
3. Review documentation: https://developers.cloudflare.com/

## Next Steps

After successful deployment:
1. Test all functionality on production
2. Submit to search engines
3. Share your portfolio link
4. Set up monitoring alerts
5. Plan regular content updates

---

**Note**: Remember to replace placeholder values (like API keys, URLs) with your actual values before deployment.
