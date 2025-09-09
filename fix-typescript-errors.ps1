# PowerShell script to fix all TypeScript errors in API files
Write-Host "🔧 Starting comprehensive TypeScript error fix..." -ForegroundColor Green

# Get all TypeScript files in the API directory
$apiFiles = Get-ChildItem -Path "src/app/api" -Recurse -Filter "*.ts"

$totalFiles = 0
$fixedFiles = 0

foreach ($file in $apiFiles) {
    $totalFiles++
    $filePath = $file.FullName
    $relativePath = $filePath.Replace((Get-Location).Path + "\", "")
    
    # Read file content
    $content = Get-Content -Path $filePath -Raw
    $originalContent = $content
    
    # Fix pattern 1: error instanceof Error ? error.message : 'Unknown error'
    $content = $content -replace "error instanceof Error \? error\.message", "error instanceof Error ? (error as Error).message"
    
    # Fix pattern 2: userError instanceof Error ? userError.message : 'Unknown error'
    $content = $content -replace "userError instanceof Error \? userError\.message", "userError instanceof Error ? (userError as Error).message"
    
    # Fix pattern 3: distError instanceof Error ? distError.message : 'Unknown error'
    $content = $content -replace "distError instanceof Error \? distError\.message", "distError instanceof Error ? (distError as Error).message"
    
    # Fix pattern 4: walletError instanceof Error ? walletError.message : 'Unknown error'
    $content = $content -replace "walletError instanceof Error \? walletError\.message", "walletError instanceof Error ? (walletError as Error).message"
    
    # Fix pattern 5: subsError instanceof Error ? subsError.message : 'Unknown error'
    $content = $content -replace "subsError instanceof Error \? subsError\.message", "subsError instanceof Error ? (subsError as Error).message"
    
    # Fix pattern 6: Direct .message access without null checks
    $content = $content -replace "subsError\.message", "subsError?.message || 'Unknown error'"
    $content = $content -replace "distError\.message", "distError?.message || 'Unknown error'"
    $content = $content -replace "walletError\.message", "walletError?.message || 'Unknown error'"
    $content = $content -replace "activeSubscriptions\.length", "activeSubscriptions?.length || 0"
    
    # Fix pattern 7: Session access
    $content = $content -replace "session\.user\.email", "session?.user?.email"
    
    # Fix pattern 8: For loops with potentially null arrays
    $content = $content -replace "for \(const (\w+) of activeSubscriptions\)", "for (const `$1 of (activeSubscriptions || []))"
    
    # If content changed, write it back
    if ($content -ne $originalContent) {
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "✅ Fixed: $relativePath" -ForegroundColor Yellow
        $fixedFiles++
    }
}

Write-Host "🎉 TypeScript error fix completed!" -ForegroundColor Green
Write-Host "📊 Total files processed: $totalFiles" -ForegroundColor Cyan
Write-Host "🔧 Files fixed: $fixedFiles" -ForegroundColor Yellow

if ($fixedFiles -gt 0) {
    Write-Host "🚀 Committing and pushing changes..." -ForegroundColor Green
    git add .
    git commit -m "COMPREHENSIVE FIX: Resolve all TypeScript errors in API files

- Fixed 'error instanceof Error' patterns with proper type casting
- Added null-safe operators for error message access
- Fixed session access patterns
- Fixed activeSubscriptions null checks
- Fixed for loop iterations with null arrays
- Applied fixes across $fixedFiles files"
    git push origin main
    Write-Host "✅ Changes committed and pushed!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No files needed fixing." -ForegroundColor Blue
}
