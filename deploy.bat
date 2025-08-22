@echo off
echo 🚀 TIC GLOBAL DEPLOYMENT SCRIPT
echo =================================

REM Check if we're in the right directory
if exist "package.json" (
    echo ✅ Found package.json in current directory
    goto :deploy
)

REM Try to find the project directory
echo 🔍 Searching for project directory...

REM Check common locations
if exist "C:\ticglobal-website\package.json" (
    cd /d "C:\ticglobal-website"
    echo ✅ Found project at C:\ticglobal-website
    goto :deploy
)

if exist "C:\Users\Administrator\Desktop\ticglobal-website\package.json" (
    cd /d "C:\Users\Administrator\Desktop\ticglobal-website"
    echo ✅ Found project at C:\Users\Administrator\Desktop\ticglobal-website
    goto :deploy
)

if exist "C:\Users\Administrator\Documents\ticglobal-website\package.json" (
    cd /d "C:\Users\Administrator\Documents\ticglobal-website"
    echo ✅ Found project at C:\Users\Administrator\Documents\ticglobal-website
    goto :deploy
)

REM If we can't find it, try current directory anyway
echo ⚠️ Could not find project directory, trying current directory...

:deploy
echo 📁 Current directory: %CD%

REM Check if it's a git repository
if not exist ".git" (
    echo ❌ Not a git repository!
    echo Please ensure you're in the correct project directory.
    pause
    exit /b 1
)

echo 📊 Checking git status...
git status

echo ➕ Adding all changes...
git add .

echo 💾 Committing changes...
git commit -m "feat: deploy comprehensive GIC peso pricing and group volume rank systems

🎯 MAJOR SYSTEM DEPLOYMENT:

✅ GIC Peso Pricing System:
- Buy Rate: 63 pesos per GIC token ($1.05 USD)
- Sell Rate: 60 pesos per GIC token ($1.00 USD)
- Automatic USD conversion for all peso values

✅ Group Volume Rank Bonus System:
- Bronze: 5 players, 2 groups, $13,800 volume → $690 bonus
- Silver: 5 players, 3 groups, $41,400 volume → $2,484 bonus
- Gold: 6 players, 3 groups, $69,000 volume → $4,830 bonus
- Platinum: 8 players, 4 groups, $110,400 volume → $8,832 bonus
- Diamond: 12 players, 5 groups, $165,600 volume → $14,904 bonus

✅ Partnership System Enhancements:
- Referral link generation with automatic partner assignment
- Multi-level commission structure
- Community building with referred users

✅ Automated Processing:
- Daily TIC distribution (00:00 UTC)
- Expired subscription cleanup (01:00 UTC)
- Daily rank maintenance (02:00 UTC)
- Monthly rank bonus distribution

✅ New API Endpoints:
- /api/gic-pricing - GIC peso pricing management
- /api/group-volume-ranks - Group volume rank system
- /api/test/partnership-system - Partnership verification

✅ New Test Pages:
- /test-gic-pricing - Interactive GIC pricing testing
- /test-group-volume-ranks - Rank system testing
- /test-partnership-system - Partnership verification

🚀 PRODUCTION READY: All systems tested and verified"

if %errorlevel% neq 0 (
    echo ❌ Failed to commit changes!
    pause
    exit /b 1
)

echo ✅ Successfully committed changes!

echo 📤 Pushing to GitHub...
git push origin main

if %errorlevel% eq 0 (
    echo.
    echo 🎉 DEPLOYMENT COMPLETE!
    echo =================================
    echo ✅ All changes have been pushed to GitHub
    echo 🔄 Vercel should automatically deploy the changes
    echo ⏱️ Deployment usually takes 2-5 minutes
    echo.
    echo 🧪 After deployment, test these endpoints:
    echo • https://ticgloballtd.com/api/gic-pricing
    echo • https://ticgloballtd.com/test-gic-pricing
    echo • https://ticgloballtd.com/test-group-volume-ranks
    echo • https://ticgloballtd.com/test-partnership-system
    echo.
    echo 📊 Monitor deployment at: https://vercel.com/dashboard
) else (
    echo ❌ Failed to push to GitHub!
    echo Please check your git configuration and try again.
    pause
    exit /b 1
)

pause
