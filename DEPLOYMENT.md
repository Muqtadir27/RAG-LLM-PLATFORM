# Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway.app account (free tier available)

## Deployment Steps

### 1. Prepare Your Repository
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Connect to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up or log in
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

### 3. Configure Environment Variables (Optional)
In your Railway project dashboard:
1. Go to "Variables" tab
2. Add these optional variables for better performance:
   - `GROQ_API_KEY` - Get from [Groq Cloud](https://console.groq.com/)
   - `HF_TOKEN` - Get from [Hugging Face](https://huggingface.co/settings/tokens)

### 4. Deploy
Railway will automatically:
- Detect the `railway.json` configuration
- Build using the Dockerfile in `backend/`
- Deploy your application
- Provide you with a live URL

## Configuration Options

### Processing Modes

**Local Mode (Default)**
- No environment variables needed
- Uses Ollama for both embeddings and generation
- Slower but completely free

**Hybrid Mode (Recommended)**
```bash
GROQ_API_KEY=your_groq_key_here
```
- Uses Ollama for embeddings (free)
- Uses Groq for generation (fast, cheap)

**Cloud Mode**
```bash
GROQ_API_KEY=your_groq_key_here
HF_TOKEN=your_hf_token_here
```
- Uses Hugging Face for embeddings
- Uses Groq for generation
- Fastest option

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that your `railway.json` is properly configured
   - Ensure all dependencies are in `backend/package.json`

2. **Runtime Errors**
   - Check Railway logs in the dashboard
   - Verify environment variables are set correctly

3. **Performance Issues**
   - Add `GROQ_API_KEY` for faster response times
   - The free tier has resource limitations

### Logs and Monitoring
- View logs in Railway dashboard under "Logs" tab
- Monitor usage in "Usage" tab
- Set up alerts for downtime

## Scaling
- Railway's free tier includes:
  - 512MB RAM
  - 1GB disk space
  - Sleeps after 12 hours of inactivity
- Upgrade to paid plans for:
  - More resources
  - Always-on instances
  - Custom domains