# AI Marketing Suite - Production Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   Neon PostgreSQL│
│  (Vercel/Netlify)│     │  (Railway/Render)│     │   (Serverless)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Redis Queue    │
                        │   (Upstash)      │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   DeepSeek AI    │
                        │   (API)          │
                        └──────────────────┘
```

## Quick Deploy (5 minutes)

### 1. Neon PostgreSQL (Database)

1. Go to [neon.tech](https://neon.tech)
2. Create account → New Project
3. Copy the connection string
4. Save as `DATABASE_URL` in your backend `.env`

```bash
# Connection string format
postgresql://username:password@ep-xxx.neon.tech/ai_marketing_suite?sslmode=require
```

### 2. Upstash Redis (Job Queue)

1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy the REST URL or Redis URL
4. Save as `REDIS_URL`

```bash
# Redis URL format
redis://default:password@xxx.upstash.io:6379
```

### 3. DeepSeek AI (LLM Backend)

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Create API key
3. Save as `DEEPSEEK_API_KEY`

### 4. Deploy Backend

**Option A: Railway (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
cd backend
railway login
railway init
railway up

# Set environment variables
railway variables set DATABASE_URL="your-neon-url"
railway variables set REDIS_URL="your-upstash-url"
railway variables set DEEPSEEK_API_KEY="your-key"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
```

**Option B: Render**
1. Connect GitHub repo to Render
2. Set build command: `npm install && npm run build && npx prisma migrate deploy`
3. Set start command: `npm start`
4. Add environment variables

**Option C: Docker (Any VPS)**
```bash
cd backend
docker-compose up -d
```

### 5. Deploy Frontend

**Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd ai-marketing-suite
vercel --prod

# Set environment variable
vercel env add VITE_API_URL
# Enter: https://your-backend.railway.app/api
```

**Netlify**
```bash
# Build first
npm run build

# Deploy dist folder
netlify deploy --prod --dir=dist
```

## Environment Variables

### Backend (.env)
```env
# Database (Neon)
DATABASE_URL="postgresql://..."

# Redis (Upstash)
REDIS_URL="redis://..."

# AI (DeepSeek)
DEEPSEEK_API_KEY="sk-..."
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"

# Security
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"
FRONTEND_URL="https://your-frontend.vercel.app"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
VITE_API_URL="https://your-backend.railway.app/api"
```

## Database Setup

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Run migrations (creates tables)
npx prisma migrate deploy

# 3. Seed demo data
npx tsx scripts/seed.ts

# 4. Verify with Prisma Studio
npx prisma studio
```

## Job Workers

The backend uses BullMQ with Redis for background job processing. You need to run workers separately:

```bash
# Terminal 1: API Server
npm run start

# Terminal 2: Job Workers
npx tsx src/jobs/queue.ts
```

Or use PM2 for production:
```bash
npm install -g pm2

pm2 start dist/server.js --name "api"
pm2 start dist/jobs/queue.js --name "workers"
pm2 startup
pm2 save
```

## Scaling Considerations

### Database (Neon)
- Neon auto-scales, no manual intervention needed
- For high traffic: upgrade to paid tier for more compute
- Enable connection pooling for serverless functions

### Redis (Upstash)
- Upstash handles scaling automatically
- Monitor memory usage and upgrade plan if needed

### API Server
- Stateless design allows horizontal scaling
- Deploy multiple instances behind a load balancer
- Use Railway/Render auto-scaling

### DeepSeek API
- Monitor token usage and costs
- Implement request caching for repeated queries
- Use cheaper models for simple tasks

## Monitoring & Logging

### Built-in Logging
- Winston logger with structured JSON output
- Request logging via Morgan
- Error tracking with stack traces

### Health Check
```bash
curl https://your-api.com/health
# Returns: { "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

### Recommended Add-ons
- **Sentry** for error tracking
- **LogRocket** for frontend session replay
- **Plausible** for privacy-friendly analytics

## Security Checklist

- [x] JWT authentication with expiration
- [x] Password hashing with bcrypt (12 rounds)
- [x] Rate limiting on all API routes
- [x] Helmet.js security headers
- [x] CORS configured for specific origin
- [x] Input validation with Zod
- [x] SQL injection protection (Prisma ORM)
- [x] Plan-based access control
- [ ] Enable HTTPS (handled by hosting provider)
- [ ] Set up API key rotation
- [ ] Configure CSP headers

## Cost Estimates (Monthly)

| Service | Free Tier | Pro Tier |
|---------|-----------|----------|
| Neon DB | 500MB + 190 compute hours | $19/mo |
| Upstash Redis | 10K commands/day | $10/mo |
| DeepSeek API | $0 (pay per use) | ~$20-50/mo |
| Railway/Render | $5/mo starter | $25/mo |
| Vercel/Netlify | Free | $20/mo |
| **Total** | **~$5/mo** | **~$75-120/mo** |

## Troubleshooting

### "Cannot connect to database"
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Neon connection limits (max 10 on free tier)
- Enable connection pooling in Neon dashboard

### "Redis connection refused"
- Verify `REDIS_URL` format
- Check Upstash firewall settings
- Ensure TLS is enabled for Upstash

### "Jobs not processing"
- Verify Redis is running and accessible
- Check worker process is running
- Look for errors in worker logs

### "DeepSeek API errors"
- Verify API key is valid
- Check token usage limits
- Monitor API rate limits

## Next Steps

1. **Custom Domain**: Add your own domain to Vercel/Netlify
2. **Email Notifications**: Integrate Resend/SendGrid for email alerts
3. **Webhooks**: Add webhook support for real-time notifications
4. **Slack Integration**: Connect Slack for team notifications
5. **Advanced Analytics**: Add Mixpanel/Amplitude for user analytics
6. **A/B Testing**: Implement feature flags for gradual rollouts

## Support

For issues or questions:
- Check the README.md in each directory
- Review the API documentation at `/health`
- Check logs in your hosting provider dashboard
