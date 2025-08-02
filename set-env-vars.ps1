# Set essential environment variables for Vercel deployment
Write-Host "Setting environment variables for Vercel deployment..."

# Email configuration
vercel env add SMTP_PORT production --value "587"
vercel env add SMTP_SECURE production --value "false"
vercel env add SMTP_EMAIL production --value "contact@ticgloballtd.com"
vercel env add SMTP_PASSWORD production --value "contact1223!"

# Resend API
vercel env add RESEND_API_KEY production --value "re_hSqjEGJA_94KJJaXGWiGuwu35nNpCTn3S"

# Firebase configuration
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production --value "AIzaSyAuSwSKq4QbUR6XmsHw6OecmDNsEo-1A8A"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production --value "ticgloballtd.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production --value "ticgloballtd"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --value "ticgloballtd.firebasestorage.app"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production --value "226058798853"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production --value "1:226058798853:web:70f55cf233fa3228aed96c"

# Blockchain configuration
vercel env add TRON_RPC_URL production --value "https://api.trongrid.io"
vercel env add BSC_RPC_URL production --value "https://bsc-dataseed1.binance.org"
vercel env add ETHEREUM_RPC_URL production --value "https://eth.llamarpc.com"
vercel env add TRONGRID_API_KEY production --value "848028a6-67db-4a19-ba64-6e1cd2f81835"

# Wallet addresses (example - replace with real ones)
vercel env add BSC_MASTER_WALLET production --value "0x61b263d67663acfbf20b4157386405b12a49c920"
vercel env add TRON_MASTER_WALLET production --value "TBpga5zct6vKAenvPecepzUfuK8raGA3Jh"

Write-Host "Environment variables set successfully!"
