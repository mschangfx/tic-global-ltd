# Simple deployment script
Write-Host "Finding project directory..." -ForegroundColor Yellow

# Get the current script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Script directory: $scriptDir" -ForegroundColor Green

# Check if we're in the project directory
if (Test-Path "$scriptDir\package.json") {
    Set-Location $scriptDir
    Write-Host "✅ Found project in script directory" -ForegroundColor Green
    
    # Check if it's a git repository
    if (Test-Path ".git") {
        Write-Host "📊 Git status:" -ForegroundColor Yellow
        git status
        
        Write-Host "➕ Adding all changes..." -ForegroundColor Yellow
        git add .
        
        Write-Host "💾 Committing changes..." -ForegroundColor Yellow
        git commit -m "feat: deploy comprehensive GIC peso pricing and group volume rank systems - All systems ready for production"
        
        Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully deployed to GitHub!" -ForegroundColor Green
            Write-Host "🔄 Vercel should automatically deploy the changes" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to push to GitHub!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Not a git repository!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No package.json found in script directory" -ForegroundColor Red
    Write-Host "Script directory: $scriptDir" -ForegroundColor Yellow
}
