# TIC Global Deployment Script
Write-Host "🚀 Starting TIC Global deployment to Vercel..." -ForegroundColor Green

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Vercel CLI not found. Please install it with: npm i -g vercel" -ForegroundColor Red
    exit 1
}

# Build the project first
Write-Host "🔨 Building the project..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed. Please fix build errors before deploying." -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Yellow
try {
    vercel --prod
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🎉 Your application is now live at: https://ticgloballtd.com" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deployment failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Deployment completed successfully!" -ForegroundColor Green
