# Vercel Serverless Deployment Guide

This NestJS application is configured for serverless deployment on Vercel.

## Prerequisites

1. Vercel account
2. Supabase database (or PostgreSQL database)
3. All environment variables configured

## Environment Variables

Set the following environment variables in your Vercel project settings:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRATION=7d

# Application
NODE_ENV=production
PORT=3000

# File Upload
MAX_FILE_SIZE_MB=20
UPLOAD_DIRECTORY=./uploads

# Simulation Settings
ENABLE_SIMULATIONS=true
OCR_SIMULATION_DELAY_MS=1500
AI_SIMULATION_DELAY_MS=2500
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub
2. Import your repository in Vercel dashboard
3. Vercel will automatically detect the configuration
4. Add environment variables in Vercel dashboard
5. Deploy

## Important Notes

### Serverless Optimizations

- **Connection Pooling**: The database module automatically adjusts connection pool settings for serverless environments (max: 1 connection per function)
- **Cold Starts**: The first request may take longer due to cold starts. Subsequent requests in the same function instance will be faster
- **File Uploads**: For production, consider using cloud storage (S3, Cloudinary, etc.) instead of local file system

### Function Configuration

The `vercel.json` file configures:
- Maximum execution time: 30 seconds
- Memory: 1024 MB
- All routes are proxied to the serverless function

### API Routes

- Base URL: `/api/v1`
- Swagger Documentation: `/api/docs`
- All routes are prefixed with `/api/v1`

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:
1. Verify `DATABASE_URL` is correctly set
2. Ensure SSL is enabled for Supabase connections
3. Check that your database allows connections from Vercel IPs

### Build Errors

If build fails:
1. Ensure all dependencies are in `package.json`
2. Check TypeScript compilation: `npm run build`
3. Verify `vercel-build` script runs successfully

### Cold Start Performance

To improve cold start times:
1. Use connection pooling (already configured)
2. Minimize dependencies
3. Consider using Vercel Pro for better performance

## Local Development

For local development, use:
```bash
npm run start:dev
```

The serverless handler (`api/index.ts`) is only used in Vercel deployment.

