# 💰 **TIC Global Wallet System Overview**

## 🎯 **System Architecture**

The TIC Global platform uses a **dual-wallet system** to separate different types of earnings and provide users with clear visibility into their income sources.

---

## 🤝 **Partner Wallet System**

### **Purpose**
Handles all **referral commissions** from the unilevel compensation structure.

### **Income Sources**
- **Daily Unilevel Commissions:** $0.44 per VIP account per day
- **Commission Rates:**
  - Level 1 (Direct): 10% = $0.044/day per VIP account
  - Level 2: 5% = $0.022/day per VIP account
  - Levels 3-10: Varying percentages based on unilevel structure

### **Key Features**
- ✅ **Real-time Commission Tracking:** Live updates as commissions are earned
- ✅ **Detailed Commission History:** Complete record of all earnings
- ✅ **Transfer Capability:** Move funds from Partner Wallet to Main Wallet
- ✅ **Balance Management:** Separate balance tracking for commission earnings
- ✅ **Status Tracking:** Pending, paid, and failed commission statuses

### **API Endpoints**
- `GET /api/partner-wallet/balance` - Get current partner wallet balance
- `GET /api/partner-wallet/commissions` - Get commission history and summary
- `POST /api/partner-wallet/transfer` - Transfer funds to main wallet
- `GET /api/partner-wallet/transfer` - Get transfer history

### **Database Tables**
- `commission_earnings` - Records all commission transactions
- `user_wallets.partner_wallet_balance` - Current partner wallet balance

---

## 🏆 **Main Wallet System (TIC/GIC Tokens)**

### **Purpose**
Handles **ranking bonuses** and token distributions from achievement-based rewards.

### **Income Sources**
- **Monthly Ranking Bonuses:** Based on referral achievements and qualification maintenance
- **Token Types:**
  - **TIC Tokens:** 50% of all ranking bonuses
  - **GIC Tokens:** 50% of all ranking bonuses

### **Ranking Bonus Structure**
| Rank | Requirements | Monthly Bonus | TIC Tokens | GIC Tokens |
|------|-------------|---------------|------------|------------|
| Bronze | 5 direct + 10th unilevel | $690 | 345 | 345 |
| Silver | 5 direct + 10th unilevel | $2,484 | 1,242 | 1,242 |
| Gold | 6 active + 10th unilevel | $4,830 | 2,415 | 2,415 |
| Platinum | 8 active + 10th unilevel | $8,832 | 4,416 | 4,416 |
| Diamond | 12 active + 10th unilevel | $14,904 | 7,452 | 7,452 |

### **Key Features**
- ✅ **Qualification Maintenance:** Monthly requirement verification
- ✅ **Automatic Token Distribution:** 50/50 TIC/GIC split
- ✅ **Direct Wallet Credit:** Tokens appear in "My Assets"
- ✅ **Transaction History:** Complete record with rank source information
- ✅ **Eligibility Tracking:** Prevents bonuses for unqualified users

### **API Endpoints**
- `GET /api/ranking-bonus/distribute` - Check qualification and eligibility
- `POST /api/ranking-bonus/distribute` - Distribute ranking bonus
- `GET /api/ranking-bonus/history` - Get ranking bonus transaction history
- `GET /api/ranking-bonus/maintenance` - Get qualification maintenance status
- `POST /api/ranking-bonus/maintenance` - Record monthly qualification

### **Database Tables**
- `user_wallets.tic_balance` - TIC token balance
- `user_wallets.gic_balance` - GIC token balance
- `wallet_transactions` - All token transactions
- `monthly_ranking_qualifications` - Qualification tracking
- `user_ranking_history` - Rank change history

---

## 🔄 **Wallet Integration Flow**

### **Daily Commission Flow**
1. **VIP Account Activity** → Generates $0.44 daily value
2. **Unilevel Calculation** → Applies commission rates by level
3. **Partner Wallet Credit** → Commission added to partner wallet balance
4. **Real-time Updates** → UI shows updated partner wallet balance
5. **User Transfer** → User can move funds to main wallet when desired

### **Monthly Ranking Bonus Flow**
1. **Qualification Check** → System verifies monthly requirements
2. **Rank Determination** → Calculates current rank based on achievements
3. **Bonus Calculation** → Determines TIC/GIC token amounts
4. **Direct Token Credit** → Tokens added to TIC/GIC balances
5. **Transaction Recording** → Complete history with rank source info

---

## 📊 **User Interface Integration**

### **Referrals Dashboard (`/referrals`)**
- **Partner Wallet Card:** Shows commission balance and transfer options
- **Ranking Bonus Card:** Shows current rank and bonus claiming
- **Ranking Maintenance Card:** Shows qualification status and history

### **My Assets Page**
- **TIC Balance:** Shows tokens from ranking bonuses
- **GIC Balance:** Shows tokens from ranking bonuses
- **Transaction History:** Shows all token transactions with sources

### **Real-time Updates**
- **WebSocket Integration:** Live balance updates
- **Activity Feed:** Real-time notifications for earnings
- **Toast Notifications:** Immediate feedback on transactions

---

## 🔐 **Security & Compliance**

### **Authentication**
- ✅ **Session-based Auth:** NextAuth + Supabase integration
- ✅ **User Isolation:** Email-based data separation
- ✅ **API Protection:** All endpoints require authentication

### **Transaction Safety**
- ✅ **Duplicate Prevention:** Unique transaction IDs
- ✅ **Balance Validation:** Prevents negative balances
- ✅ **Audit Trail:** Complete transaction logging
- ✅ **Error Handling:** Comprehensive error management

### **Data Integrity**
- ✅ **Database Constraints:** Proper foreign keys and validations
- ✅ **Transaction Atomicity:** Database-level consistency
- ✅ **Backup Systems:** Regular data backups
- ✅ **Monitoring:** Real-time system health checks

---

## 🎯 **Key Benefits of Dual-Wallet System**

### **For Users**
- 🎯 **Clear Income Separation:** Understand different earning sources
- 💰 **Flexible Fund Management:** Control when to move commission earnings
- 📊 **Detailed Analytics:** Track performance across both earning types
- 🏆 **Achievement Recognition:** Ranking bonuses reward sustained performance

### **For Platform**
- 🔄 **Scalable Architecture:** Handle different earning mechanisms
- 📋 **Compliance Ready:** Separate tracking for different income types
- 🔍 **Enhanced Analytics:** Detailed insights into user earning patterns
- 🛡️ **Risk Management:** Isolated systems for different earning types

---

## 🚀 **System Status**

### **✅ FULLY OPERATIONAL**

Both wallet systems are fully implemented and integrated:

- ✅ **Partner Wallet:** Commission tracking and management
- ✅ **Main Wallet:** TIC/GIC token distribution and tracking
- ✅ **API Integration:** Complete REST API coverage
- ✅ **UI Components:** User-friendly interface elements
- ✅ **Real-time Updates:** Live balance and transaction updates
- ✅ **Security:** Authentication and data protection
- ✅ **Documentation:** Complete system documentation

**🎉 The dual-wallet system provides users with comprehensive earning tracking while maintaining clear separation between commission earnings and ranking achievement rewards!**
