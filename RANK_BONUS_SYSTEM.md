# 🏆 Rank Bonus Distribution System

## Overview

The Rank Bonus Distribution System automatically distributes monthly bonuses to users based on their referral rank. **50% of each bonus is distributed as TIC tokens and 50% as GIC tokens** directly to the user's wallet assets.

## 🎯 Rank Structure & Bonuses

| Rank | Referrals Required | Monthly Bonus | TIC Tokens | GIC Tokens |
|------|-------------------|---------------|------------|------------|
| **Common** | 0 referrals | $0 | 0 TIC | 0 GIC |
| **Advance** | 1-10 referrals | $0 | 0 TIC | 0 GIC |
| **Bronze** | 11+ referrals | $690 | 345 TIC | 345 GIC |
| **Silver** | 12+ referrals | $2,484 | 1,242 TIC | 1,242 GIC |
| **Gold** | 13+ referrals | $4,830 | 2,415 TIC | 2,415 GIC |
| **Platinum** | 14+ referrals | $8,832 | 4,416 TIC | 4,416 GIC |
| **Diamond** | 15+ referrals | $14,904 | 7,452 TIC | 7,452 GIC |

## 🏗️ System Architecture

### Database Tables

#### `rank_bonus_distributions`
Tracks all monthly bonus distributions:
```sql
- id: UUID (Primary Key)
- user_email: VARCHAR(255) (User identifier)
- rank: VARCHAR(50) (User's rank at time of distribution)
- total_referrals: INTEGER (Number of active referrals)
- bonus_amount: DECIMAL(10,2) (Total bonus amount in USD)
- tic_amount: DECIMAL(18,8) (50% as TIC tokens)
- gic_amount: DECIMAL(18,8) (50% as GIC tokens)
- distribution_month: VARCHAR(7) (YYYY-MM format)
- status: VARCHAR(20) (pending, completed, failed)
- created_at: TIMESTAMP
- processed_at: TIMESTAMP
```

#### `user_wallets` (Updated)
Enhanced to track TIC and GIC token balances:
```sql
- tic_balance: DECIMAL(18,8) (TIC token balance)
- gic_balance: DECIMAL(18,8) (GIC token balance)
```

### Database Functions

#### `process_user_rank_bonus(user_email, month)`
Main function that:
1. Calculates user's current rank based on active referrals
2. Determines bonus amount based on rank
3. Splits bonus 50/50 between TIC and GIC tokens
4. Credits tokens to user's wallet
5. Records distribution in database

#### `increment_tic_balance(user_email, amount)`
Safely increments user's TIC token balance

#### `increment_gic_balance(user_email, amount)`
Safely increments user's GIC token balance

## 🔄 Distribution Process

### Manual Distribution
```typescript
POST /api/rank-bonus/distribute
{
  "month": "2024-01",
  "userEmail": "user@example.com" // Optional - for single user
}
```

### Automated Monthly Distribution
```typescript
POST /api/cron/rank-bonus-monthly
Authorization: Bearer YOUR_CRON_SECRET
```

### Check Distribution Status
```typescript
GET /api/rank-bonus/distribute?month=2024-01
GET /api/rank-bonus/history // User's personal history
```

## 💰 Token Distribution Logic

### Calculation Example (Bronze Rank):
- **Monthly Bonus**: $690
- **TIC Tokens**: $690 ÷ 2 = 345 TIC
- **GIC Tokens**: $690 ÷ 2 = 345 GIC
- **Wallet Update**: 
  - `tic_balance += 345`
  - `gic_balance += 345`

### Token Values:
- **TIC Tokens**: $0.02 per token (for display purposes)
- **GIC Tokens**: $1.00 per token (1:1 USD ratio)
- **Bonus Distribution**: 1 TIC = $1, 1 GIC = $1 (for bonus purposes)

## 🎨 User Interface Components

### RankBonusCard (Wallet Page)
Displays:
- Current rank and monthly bonus amount
- TIC/GIC tokens earned per month
- Total bonus history
- Distribution history modal

### Community Tab (Referrals Page)
Shows:
- Current rank status with visual indicators
- Referral network with individual ranks
- Rank progression requirements
- Monthly bonus information

## 🔧 API Endpoints

### `/api/rank-bonus/distribute`
- **POST**: Distribute bonuses (manual/single user)
- **GET**: Check distribution status for a month

### `/api/rank-bonus/history`
- **GET**: Get user's personal bonus history

### `/api/cron/rank-bonus-monthly`
- **POST**: Automated monthly distribution (cron job)
- **GET**: Check monthly distribution status

## 🚀 Deployment & Automation

### Monthly Cron Job Setup
Set up a monthly cron job to call:
```bash
curl -X POST https://your-domain.com/api/cron/rank-bonus-monthly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Environment Variables
```env
CRON_SECRET=your-secure-cron-secret-key
```

### Recommended Schedule
- **Day**: 1st of each month
- **Time**: 00:00 UTC
- **Frequency**: Monthly

## 🔒 Security Features

### Duplicate Prevention
- Unique constraint on `(user_email, distribution_month)`
- Function checks for existing distributions before processing

### Authentication
- Cron endpoint requires Bearer token authentication
- User endpoints require valid session authentication

### Error Handling
- Comprehensive error logging
- Graceful failure handling
- Transaction rollback on errors

## 📊 Monitoring & Analytics

### Distribution Metrics
- Total users processed
- Successful vs failed distributions
- Total bonus amounts distributed
- TIC/GIC token distribution totals

### User Metrics
- Rank progression tracking
- Monthly bonus history
- Token balance growth

## 🧪 Testing

### Test Pages
- `/test-rank-bonus` - Manual distribution testing
- `/test-community` - Create test referrals for rank testing

### Test Scenarios
1. Create 11+ test referrals to achieve Bronze rank
2. Run manual distribution for current month
3. Verify TIC/GIC tokens credited to wallet
4. Check distribution history and status

## 🎯 Benefits

### For Users
- **Automatic Rewards**: Monthly bonuses distributed automatically
- **Dual Token Benefits**: Receive both TIC and GIC tokens
- **Transparent Tracking**: Full history of all distributions
- **Real-time Updates**: Wallet balances update immediately

### For Platform
- **Incentivized Growth**: Encourages referral activity
- **Automated System**: Minimal manual intervention required
- **Scalable Architecture**: Handles growing user base
- **Comprehensive Logging**: Full audit trail of all distributions

## 🔄 Future Enhancements

### Potential Improvements
1. **Dynamic Token Ratios**: Adjust TIC/GIC split based on market conditions
2. **Bonus Multipliers**: Special events with increased bonuses
3. **Rank Decay**: Implement rank maintenance requirements
4. **Advanced Analytics**: Detailed performance dashboards
5. **Mobile Notifications**: Push notifications for bonus distributions

### Integration Opportunities
1. **Email Notifications**: Send bonus confirmation emails
2. **Social Sharing**: Allow users to share rank achievements
3. **Gamification**: Add achievement badges and milestones
4. **Staking Integration**: Bonus tokens automatically stake for higher yields

## 📈 Success Metrics

### Key Performance Indicators
- **Monthly Active Referrers**: Users earning bonuses
- **Total Bonus Distribution**: USD value distributed monthly
- **Token Circulation**: TIC/GIC tokens in user wallets
- **Rank Progression**: Users advancing through ranks
- **System Reliability**: Distribution success rate (target: 99.9%)

---

## 🚀 **SYSTEM STATUS: FULLY OPERATIONAL**

The Rank Bonus Distribution System is now live and ready for production use! 🎉

- ✅ **Database Setup**: Complete
- ✅ **API Endpoints**: Functional
- ✅ **User Interface**: Integrated
- ✅ **Testing Tools**: Available
- ✅ **Documentation**: Comprehensive
- ✅ **Security**: Implemented
- ✅ **Automation**: Ready for deployment
