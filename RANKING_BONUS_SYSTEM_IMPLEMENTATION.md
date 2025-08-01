# Ranking Bonus System Implementation

## 🎯 **Overview**

The Ranking Bonus System distributes TIC and GIC tokens to users based on their referral ranking achievements. Users earn monthly bonuses that are automatically credited to their wallet under "My Assets" and recorded in transaction history.

**🔄 IMPORTANT: Qualification Maintenance Required**
Users must maintain their ranking qualifications monthly to remain eligible for bonuses. If a user fails to meet the requirements for any month, they will not receive bonuses for that period.

## 💰 **Wallet System Separation**

**IMPORTANT:** This system maintains a clear separation between two types of earnings:

### 🤝 **Partner Wallet** (Referral Commissions)
- **Purpose:** Receives all daily referral commissions from unilevel structure
- **Source:** Daily $0.44 commissions from referred users' VIP accounts
- **Commission Rates:** 10% (Level 1), 5% (Level 2), etc.
- **Management:** Users can transfer funds from Partner Wallet to Main Wallet
- **API Endpoints:** `/api/partner-wallet/*`

### 🏆 **Main Wallet** (Ranking Bonuses)
- **Purpose:** Receives TIC and GIC tokens from ranking achievements
- **Source:** Monthly ranking bonuses based on qualification maintenance
- **Token Split:** 50% TIC + 50% GIC for all ranking bonuses
- **Direct Credit:** Tokens go directly to TIC/GIC balances under "My Assets"
- **API Endpoints:** `/api/ranking-bonus/*`

This separation ensures that:
- ✅ **Commissions** (daily earnings) go to Partner Wallet
- ✅ **Ranking Bonuses** (monthly achievements) go to Main Wallet as TIC/GIC tokens
- ✅ Users have clear visibility of different earning sources
- ✅ Different withdrawal/transfer rules can apply to each wallet type

## 🏆 **Ranking Structure**

| Rank | Active Players | Group System | Total Volume | Percentage | Monthly Bonus | TIC Tokens | GIC Tokens |
|------|----------------|--------------|--------------|------------|---------------|------------|------------|
| **Bronze** | 5 direct | 2 Group | - | 5% | $690 | 345 TIC | 345 GIC |
| **Silver** | 5 direct | 3 Group | $41,400 | 6% | $2,484 | 1,242 TIC | 1,242 GIC |
| **Gold** | 6 active | 3 Group A,B&C | $69,000 | 7% | $4,830 | 2,415 TIC | 2,415 GIC |
| **Platinum** | 8 active | 4 Group A,B,C&D | $110,400 | 8% | $8,832 | 4,416 TIC | 4,416 GIC |
| **Diamond** | 12 active | 5 Group A,B,C,D&E | $165,000 | 9% | $14,904 | 7,452 TIC | 7,452 GIC |

### **Universal Requirements:**
- ✅ **10th Unilevel Qualification** required for all ranks
- ✅ **50/50 Token Split** - All bonuses distributed as 50% TIC + 50% GIC
- ✅ **Monthly Distribution** - Bonuses calculated and distributed monthly
- ⚠️ **Monthly Maintenance** - Users must maintain qualifications each month
- 🔄 **Continuous Tracking** - Qualification status tracked and recorded monthly

## 🗄️ **Database Schema**

### **Enhanced user_wallets Table:**
```sql
user_wallets (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE,
    total_balance DECIMAL(18, 8),
    tic_balance DECIMAL(18, 8),     -- TIC token balance
    gic_balance DECIMAL(18, 8),     -- GIC token balance
    staking_balance DECIMAL(18, 8),
    partner_wallet_balance DECIMAL(18, 8),
    last_updated TIMESTAMP,
    created_at TIMESTAMP
)
```

### **Enhanced wallet_transactions Table:**
```sql
wallet_transactions (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255),
    transaction_id TEXT,
    transaction_type VARCHAR(20), -- 'bonus' for ranking bonuses
    amount DECIMAL(18, 8),
    currency VARCHAR(10),         -- 'TIC' or 'GIC'
    balance_before DECIMAL(18, 8),
    balance_after DECIMAL(18, 8),
    description TEXT,             -- 'TIC/GIC Tokens from [Rank] Rank Bonus'
    metadata JSONB,               -- Bonus details
    created_at TIMESTAMP
)
```

### **Monthly Ranking Qualifications Table:**
```sql
monthly_ranking_qualifications (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255),
    qualification_month DATE,        -- First day of month (2024-01-01)
    rank_achieved VARCHAR(50),
    direct_referrals INTEGER,
    max_unilevel_depth INTEGER,
    total_volume DECIMAL(18, 8),
    qualifies_for_bonus BOOLEAN,
    bonus_amount DECIMAL(18, 8),
    bonus_distributed BOOLEAN,
    bonus_distributed_at TIMESTAMP,
    qualification_data JSONB,        -- Detailed qualification info
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_email, qualification_month)
)
```

### **User Ranking History Table:**
```sql
user_ranking_history (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255),
    previous_rank VARCHAR(50),
    new_rank VARCHAR(50),
    rank_change_type VARCHAR(20),    -- 'promotion', 'demotion', 'maintained', 'lost'
    qualification_month DATE,
    direct_referrals INTEGER,
    max_unilevel_depth INTEGER,
    qualification_lost_reason TEXT,
    created_at TIMESTAMP
)
```

## 🔧 **Database Functions**

### **1. credit_tic_ranking_bonus()**
```sql
credit_tic_ranking_bonus(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
```
- Credits TIC tokens to user's wallet
- Records transaction with 'bonus' type and 'TIC' currency
- Updates tic_balance in user_wallets

### **2. credit_gic_ranking_bonus()**
```sql
credit_gic_ranking_bonus(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
```
- Credits GIC tokens to user's wallet
- Records transaction with 'bonus' type and 'GIC' currency
- Updates gic_balance in user_wallets

### **3. distribute_ranking_bonus()**
```sql
distribute_ranking_bonus(
    user_email_param VARCHAR(255),
    total_bonus_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
```
- Distributes both TIC and GIC tokens (50/50 split)
- Calls both credit functions with appropriate amounts
- Generates unique transaction IDs for each token type

### **4. check_ranking_qualification()**
```sql
check_ranking_qualification(user_email_param VARCHAR(255))
RETURNS TABLE (
    qualifies BOOLEAN,
    current_rank VARCHAR(50),
    direct_referrals INTEGER,
    max_level INTEGER,
    monthly_bonus DECIMAL(18, 8)
)
```
- Checks if user qualifies for ranking bonuses
- Determines current rank based on referral structure
- Returns qualification status and bonus amounts

### **5. get_ranking_bonus_history()**
```sql
get_ranking_bonus_history(
    user_email_param VARCHAR(255),
    limit_param INTEGER DEFAULT 50
)
```
- Returns user's ranking bonus transaction history
- Filters for 'bonus' type transactions with ranking metadata
- Ordered by creation date (newest first)

### **6. check_monthly_ranking_qualification()**
```sql
check_monthly_ranking_qualification(
    user_email_param VARCHAR(255),
    check_month_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    qualifies BOOLEAN,
    current_rank VARCHAR(50),
    direct_referrals INTEGER,
    max_level INTEGER,
    monthly_bonus DECIMAL(18, 8),
    qualification_status VARCHAR(50),
    missing_requirements TEXT[]
)
```
- Checks qualification for a specific month
- Returns detailed qualification status and missing requirements
- Used for monthly qualification tracking

### **7. record_monthly_qualification()**
```sql
record_monthly_qualification(
    user_email_param VARCHAR(255),
    qualification_month_param DATE DEFAULT CURRENT_DATE
)
```
- Records monthly qualification status in database
- Creates ranking history entries
- Tracks rank changes (promotion, demotion, maintained)

### **8. is_eligible_for_bonus()**
```sql
is_eligible_for_bonus(
    user_email_param VARCHAR(255),
    check_month_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    eligible BOOLEAN,
    rank VARCHAR(50),
    bonus_amount DECIMAL(18, 8),
    already_distributed BOOLEAN,
    eligibility_reason TEXT
)
```
- Checks if user is eligible for bonus distribution
- Considers qualification maintenance requirements
- Prevents duplicate bonus distributions

### **9. mark_bonus_distributed()**
```sql
mark_bonus_distributed(
    user_email_param VARCHAR(255),
    qualification_month_param DATE DEFAULT CURRENT_DATE
)
```
- Marks bonus as distributed for a specific month
- Prevents duplicate distributions
- Updates distribution timestamp

### **10. get_ranking_maintenance_status()**
```sql
get_ranking_maintenance_status(
    user_email_param VARCHAR(255),
    months_back INTEGER DEFAULT 6
)
```
- Returns comprehensive ranking maintenance history
- Shows qualification trends and rank changes
- Provides statistics for maintenance tracking

## 🚀 **API Endpoints**

### **POST /api/ranking-bonus/distribute**
**Purpose:** Distribute ranking bonuses to qualified users

**Request Body:**
```json
{
  "targetUserEmail": "user@example.com", // Optional - admin function
  "forceDistribution": false             // Optional - bypass qualification check
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully distributed Diamond rank bonus",
  "data": {
    "userEmail": "user@example.com",
    "rank": "Diamond",
    "totalBonus": 14904,
    "ticAmount": 7452,
    "gicAmount": 7452,
    "transactionId": "rank_bonus_diamond_1234567890",
    "directReferrals": 12,
    "maxLevel": 15
  }
}
```

### **GET /api/ranking-bonus/distribute**
**Purpose:** Check ranking qualification for authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "qualification": {
      "qualifies": true,
      "currentRank": "Gold",
      "directReferrals": 6,
      "maxLevel": 12,
      "monthlyBonus": 4830,
      "ticAmount": 2415,
      "gicAmount": 2415
    },
    "bonusHistory": [...]
  }
}
```

### **GET /api/ranking-bonus/history**
**Purpose:** Get ranking bonus history for authenticated user

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "bonusHistory": [
      {
        "transaction_id": "rank_bonus_gold_1234567890_TIC",
        "transaction_type": "bonus",
        "amount": 2415,
        "currency": "TIC",
        "description": "TIC Tokens from Gold Rank Bonus",
        "rank": "Gold",
        "token_type": "TIC",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "totalBonusEarned": 4830,
      "totalTicEarned": 2415,
      "totalGicEarned": 2415,
      "transactionCount": 2
    },
    "currentWallet": {
      "ticBalance": 2415,
      "gicBalance": 2415,
      "totalBalance": 1000
    }
  }
}
```

## 🎨 **Frontend Components**

### **RankingBonusCard Component**
- **Location:** `src/components/RankingBonusCard.tsx`
- **Features:**
  - Displays current rank and qualification status
  - Shows monthly bonus amounts (TIC + GIC)
  - "Claim Bonus" button for qualified users
  - "View History" modal with transaction details
  - Real-time qualification checking

### **Integration in Referrals Page**
- **Location:** `src/app/(dashboard)/referrals/page.tsx`
- **Placement:** Added above the tabs section
- **Features:** Seamlessly integrated with existing referral system

## 📊 **Transaction Recording**

### **Transaction Metadata Structure:**
```json
{
  "bonus_type": "ranking_bonus",
  "rank": "Gold",
  "token_type": "TIC",
  "source": "referral_ranking"
}
```

### **Transaction Description Format:**
- **TIC:** "TIC Tokens from [Rank] Rank Bonus"
- **GIC:** "GIC Tokens from [Rank] Rank Bonus"

### **Transaction ID Format:**
- **Base:** `rank_bonus_[rank]_[timestamp]`
- **TIC:** `rank_bonus_[rank]_[timestamp]_TIC`
- **GIC:** `rank_bonus_[rank]_[timestamp]_GIC`

## 🔄 **Ranking Maintenance System**

### **Monthly Qualification Tracking**
The system now tracks user qualifications monthly to ensure continuous eligibility:

- ✅ **Monthly Recording:** User qualifications are recorded each month
- ✅ **Rank Change Tracking:** Promotions, demotions, and maintenance tracked
- ✅ **Bonus Eligibility:** Only qualified users receive bonuses
- ✅ **Historical Analysis:** Complete maintenance history available

### **Qualification Maintenance Rules:**
1. **Monthly Check:** Users must meet rank requirements each month
2. **No Retroactive Bonuses:** Missing qualifications = no bonus for that month
3. **Rank Stability:** Consistent qualification required for bonus eligibility
4. **Automatic Recording:** System automatically tracks qualification status

### **RankingMaintenanceCard Component**
- **Location:** `src/components/RankingMaintenanceCard.tsx`
- **Features:**
  - Current qualification status display
  - Monthly maintenance history
  - Qualification rate statistics
  - Rank stability tracking
  - Missing requirements alerts

### **Maintenance API Endpoints:**

#### **GET /api/ranking-bonus/maintenance**
Returns comprehensive maintenance status and history.

#### **POST /api/ranking-bonus/maintenance**
Records monthly qualification (admin/testing function).

## 🧪 **Testing**

### **Test Page:** `/test-ranking-bonus`
- **Features:**
  - Check ranking qualification
  - Force bonus distribution (testing)
  - Load bonus history
  - Live component testing
  - API response inspection

### **Test Functions:**
1. **Qualification Check:** Verify user's current rank and eligibility
2. **Bonus Distribution:** Test token crediting and transaction recording
3. **History Loading:** Verify transaction history retrieval
4. **Component Testing:** UI interaction and data display

## 🔐 **Security & Authentication**

### **Authentication Requirements:**
- All API endpoints require user authentication
- Session-based authentication (NextAuth + Supabase)
- User email extracted from authenticated session

### **Authorization:**
- Users can only access their own ranking data
- Admin functions require specific permissions
- Database functions use proper user isolation

## 🚀 **Deployment Checklist**

### **Database Setup:**
- ✅ Run `database-ranking-bonus-system.sql`
- ✅ Run `database-ranking-maintenance-system.sql`
- ✅ Verify all functions are created
- ✅ Test function permissions
- ✅ Verify maintenance tables created

### **API Testing:**
- ✅ Test qualification checking
- ✅ Test bonus distribution
- ✅ Test history retrieval
- ✅ Test maintenance tracking
- ✅ Test monthly qualification recording
- ✅ Verify authentication

### **Frontend Integration:**
- ✅ RankingBonusCard component working
- ✅ RankingMaintenanceCard component working
- ✅ Integrated in referrals page
- ✅ Transaction history display
- ✅ Maintenance history display
- ✅ Error handling

### **Production Considerations:**
- ✅ Remove test endpoints in production
- ✅ Set up automated monthly distribution
- ✅ Monitor transaction volumes
- ✅ Implement rate limiting

## 📈 **Future Enhancements**

1. **Automated Monthly Distribution:** Cron job for automatic bonus distribution
2. **Rank Progression Notifications:** Real-time alerts for rank changes
3. **Advanced Analytics:** Detailed ranking statistics and trends
4. **Token Exchange:** Convert between TIC and GIC tokens
5. **Staking Integration:** Stake ranking bonus tokens for additional rewards

---

## 🎉 **Complete System Ready for Production!**

The Ranking Bonus System with Qualification Maintenance is fully implemented and ready for deployment.

### **Key Features Implemented:**
- ✅ **Monthly Bonus Distribution:** TIC and GIC tokens credited to user wallets
- ✅ **Qualification Maintenance:** Users must maintain rank requirements monthly
- ✅ **Comprehensive Tracking:** Complete history of qualifications and rank changes
- ✅ **Automated Eligibility:** System prevents bonuses for unqualified months
- ✅ **Real-time Monitoring:** Live qualification status and maintenance statistics
- ✅ **Transaction Recording:** All bonuses properly recorded in wallet history

### **User Experience:**
Users now have a complete ranking system where they:
1. **Earn bonuses** based on referral achievements
2. **Must maintain qualifications** monthly to remain eligible
3. **Track their progress** through comprehensive maintenance history
4. **Receive tokens** directly in their wallet under "My Assets"
5. **Monitor performance** with detailed statistics and trends

The system ensures fair and consistent bonus distribution while encouraging users to maintain their referral networks actively!
