# Vercel Setup Guide

This guide will help you set up Vercel to automatically deploy from GitHub pushes.

## Step 1: Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select **"GitHub"** as your Git provider
5. If not connected, authorize Vercel to access your GitHub account
6. Find and select the repository: **`ivan-dankov/cycler-app`**
7. Click **"Import"**

## Step 2: Configure Project Settings

### Framework Preset
- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### Environment Variables

Add these environment variables in the Vercel project settings:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

**Important**: 
- Make sure to add them for all environments (Production, Preview, Development)
- The `SUPABASE_SERVICE_ROLE_KEY` should be kept secret and never exposed to the client

## Step 3: Enable Automatic Deployments

1. In your Vercel project, go to **Settings** → **Git**
2. Make sure **"Automatic deployments from Git"** is enabled
3. Under **"Production Branch"**, ensure it's set to `main`
4. Enable **"Vercel for Git"** integration if not already enabled

## Step 4: Verify GitHub Integration

1. Go to your GitHub repository: `https://github.com/ivan-dankov/cycler-app`
2. Check **Settings** → **Webhooks**
3. You should see a webhook from Vercel that triggers on:
   - Push events
   - Pull request events

If the webhook is missing:
1. Go back to Vercel Dashboard
2. Project Settings → Git → Disconnect
3. Reconnect the repository

## Step 5: Test the Deployment

1. Make a small change to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Go to Vercel Dashboard
4. You should see a new deployment starting automatically
5. Wait for it to complete (usually 1-2 minutes)

## Troubleshooting

### Vercel not detecting pushes

1. **Check GitHub Webhook**:
   - Go to GitHub repo → Settings → Webhooks
   - Verify Vercel webhook exists and is active
   - Check recent deliveries for errors

2. **Reconnect Repository**:
   - Vercel Dashboard → Project Settings → Git
   - Click "Disconnect"
   - Reconnect and re-import

3. **Check Branch Settings**:
   - Ensure Production Branch is set to `main`
   - Verify the branch exists in GitHub

### Build Failures

1. **Check Build Logs**:
   - Vercel Dashboard → Deployments → Click on failed deployment
   - Review build logs for errors

2. **Common Issues**:
   - Missing environment variables
   - Node version mismatch (should be 18+)
   - Missing dependencies

### Environment Variables Not Working

1. **Verify Variables**:
   - Settings → Environment Variables
   - Ensure variables are added for the correct environment
   - Check for typos in variable names

2. **Redeploy**:
   - After adding/changing environment variables, trigger a new deployment
   - Go to Deployments → Click "..." → Redeploy

## Manual Deployment (Alternative)

If automatic deployments aren't working, you can deploy manually:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Link project:
   ```bash
   vercel link
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

## Next Steps

Once set up correctly:
- Every push to `main` will trigger a production deployment
- Pull requests will create preview deployments
- You can view deployment status in Vercel Dashboard
- Deployment URLs will be available in the Vercel project

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git)
- [Vercel Support](https://vercel.com/support)


