# 💰 Unilevel Commission System

## Overview

The Unilevel Commission System distributes daily commissions to users based on their referral network's VIP plan earnings. The system follows a multi-level structure where users earn commissions from up to 15 levels of referrals.

## 🎯 Commission Structure

### Base Calculation
- **VIP Plan Value**: $138
- **Monthly Earnings**: $138 × 10% = $13.8 per month
- **Daily Earnings**: $13.8 ÷ 30 = $0.44 per day per VIP account

### Commission Rates by Level
| Level | Commission Rate | Daily Bonus per VIP Account | Monthly Bonus per VIP Account |
|-------|----------------|----------------------------|------------------------------|
| **Level 1** | 10% | $0.044 | $1.32 |
| **Levels 2-6** | 5% | $0.022 | $0.66 |
| **Levels 7-10** | 2.5% | $0.011 | $0.33 |
| **Levels 11-15** | 1% | $0.0044 | $0.132 |

### Access Rules
- **VIP Members**: Can earn commissions up to 15 levels deep
- **Starter Members**: Can earn commissions from level 1 only

## 🏗️ System Architecture

### Database Tables

#### `unilevel_commissions`
Tracks daily commission distributions:
```sql
- id: UUID (Primary Key)
- referrer_email: VARCHAR(255) (Commission recipient)
- referred_email: VARCHAR(255) (VIP account holder)
- referrer_level: INTEGER (1-15 levels)
- plan_type: VARCHAR(50) (VIP or Starter)
- base_daily_earnings: DECIMAL(10,4) (Always $0.44)
- commission_rate: DECIMAL(5,4) (Level-based rate)
- daily_commission: DECIMAL(10,4) (Calculated commission)
- distribution_date: DATE (YYYY-MM-DD)
- status: VARCHAR(20) (pending, distributed, failed)
```

### Database Functions

#### `get_unilevel_commission_rate(level)`
Returns commission rate based on referral level:
- Level 1: 10%
- Levels 2-6: 5%
- Levels 7-10: 2.5%
- Levels 11-15: 1%

#### `calculate_daily_unilevel_commissions(date)`
Main function that:
1. Processes all users with active referrals
2. Calculates referral network up to max levels (15 for VIP, 1 for Starter)
3. Counts VIP accounts for each referral
4. Calculates and distributes daily commissions
5. Updates partner wallet balances
6. Creates transaction records

#### `get_user_referral_network(user_email, max_levels)`
Recursive function to get user's referral network with levels

## 🔄 Daily Distribution Process

### Automated Daily Processing
```typescript
// Runs daily at midnight via cron job
POST /api/cron/daily-unilevel-commissions
Authorization: Bearer CRON_SECRET

// Process:
1. Check if already distributed for today
2. Get all users with active referrals
3. For each user:
   - Determine plan type (VIP/Starter) → max levels
   - Get referral network up to max levels
   - Count VIP accounts per referral
   - Calculate commission: $0.44 × rate × VIP count
   - Credit to partner wallet
   - Create transaction record
```

### Manual Distribution (Testing)
```typescript
POST /api/unilevel-commissions/distribute
{
  "date": "2024-01-15",
  "userEmail": "user@example.com" // Optional for single user
}
```

## 💡 Commission Calculation Examples

### Example 1: Level 1 Referral with 2 VIP Accounts
```typescript
Base earnings: $0.44 per VIP account
Level 1 rate: 10%
VIP accounts: 2
Daily commission: $0.44 × 0.10 × 2 = $0.088
Monthly commission: $0.088 × 30 = $2.64
```

### Example 2: Level 5 Referral with 1 VIP Account
```typescript
Base earnings: $0.44 per VIP account
Level 5 rate: 5% (Levels 2-6)
VIP accounts: 1
Daily commission: $0.44 × 0.05 × 1 = $0.022
Monthly commission: $0.022 × 30 = $0.66
```

### Example 3: VIP User with 15-Level Network
```typescript
// User has VIP plan → can earn up to 15 levels
Level 1: 3 VIP accounts → $0.44 × 0.10 × 3 = $0.132
Level 3: 2 VIP accounts → $0.44 × 0.05 × 2 = $0.044
Level 8: 1 VIP account → $0.44 × 0.025 × 1 = $0.011
Level 12: 1 VIP account → $0.44 × 0.01 × 1 = $0.0044

Total daily commission: $0.1914
Total monthly commission: $5.742
```

## 🎨 User Interface Integration

### Partner Wallet Display
- Shows commission structure information
- Displays daily earnings from unilevel commissions
- Transfer functionality to main wallet

### Transaction History
- Commission earnings show as "unilevel_daily" type
- Clear level identification in descriptions
- VIP account count in transaction details

## 🔧 API Endpoints

### `/api/unilevel-commissions/distribute`
- **POST**: Distribute daily commissions (manual/testing)
- **GET**: Check distribution status and history

### `/api/cron/daily-unilevel-commissions`
- **POST**: Automated daily distribution (cron job)
- **GET**: Check daily distribution status

### `/api/partner-wallet/commissions`
- **GET**: Get user's commission history including unilevel earnings

## 🧪 Testing System

### Test Page (`/test-unilevel-commissions`)
- Manual distribution testing
- Single user vs bulk distribution
- Commission history viewing
- Real-time calculation verification

### Test Scenarios
```typescript
1. Create referral network with VIP plans
2. Run daily distribution
3. Verify commissions calculated correctly
4. Check partner wallet balance updates
5. Confirm transaction history records
```

## 🚀 Production Deployment

### Cron Job Setup
```bash
# Daily at midnight UTC
0 0 * * * curl -X POST https://your-domain.com/api/cron/daily-unilevel-commissions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Environment Variables
```env
CRON_SECRET=your-secure-cron-secret-key
```

### Monitoring
- Daily distribution success/failure rates
- Total commission amounts distributed
- User participation statistics
- System performance metrics

## 🔒 Security & Performance

### Security Features
- Cron endpoint authentication
- Duplicate distribution prevention
- Transaction integrity with rollback
- User plan verification

### Performance Optimizations
- Recursive CTE for efficient network traversal
- Indexed database queries
- Batch processing for large user bases
- Error handling with graceful degradation

## 📊 Business Logic

### Commission Eligibility
- Only VIP accounts generate commissions
- Referrer must have active plan to receive commissions
- Commission levels limited by referrer's plan type
- Daily distribution prevents double-processing

### Calculation Rules
- Base: $0.44 daily per VIP account
- Rate: Level-dependent percentage
- Multiple: Number of VIP accounts per referral
- Formula: `$0.44 × Level Rate × VIP Account Count`

## 🎯 Expected Results

### For Users
- **Daily Passive Income**: Automatic commission distribution
- **Scalable Earnings**: More referrals = more commissions
- **Transparent Tracking**: Complete history of all earnings
- **Instant Access**: Commissions available in partner wallet

### For Platform
- **Automated Processing**: No manual intervention required
- **Scalable Architecture**: Handles growing user base
- **Accurate Calculations**: Precise commission distribution
- **Complete Audit Trail**: Full transaction history

---

## 🚀 **SYSTEM STATUS: FULLY OPERATIONAL**

The Unilevel Commission System is now live and ready for production use! 🎉

- ✅ **Database Structure**: Complete with all tables and functions
- ✅ **API Endpoints**: Functional for manual and automated distribution
- ✅ **Cron Job Ready**: Automated daily processing
- ✅ **User Interface**: Integrated with partner wallet system
- ✅ **Testing Tools**: Comprehensive test page available
- ✅ **Documentation**: Complete system documentation
- ✅ **Security**: Authentication and error handling implemented
- ✅ **Performance**: Optimized for scale and efficiency

**Users now earn daily commissions based on their referral network's VIP plan activity, with automatic distribution to their Partner Wallet!** 💰🏆📊
