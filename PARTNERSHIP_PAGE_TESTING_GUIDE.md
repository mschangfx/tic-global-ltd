# 🧪 **Partnership Page Testing Guide**

## 🎯 **Testing Overview**

The partnership/referrals page now includes the **dual-wallet system** with clear separation between referral commissions and ranking bonuses. Here's how to test all functionality.

---

## 🔗 **Test URLs**

### **Main Pages:**
- **Referrals Dashboard:** `http://localhost:8000/referrals`
- **Component Test Page:** `http://localhost:8000/test-components`
- **Ranking Bonus Test:** `http://localhost:8000/test-ranking-bonus`

### **API Endpoints to Test:**
- **Partner Wallet Balance:** `http://localhost:8000/api/partner-wallet/balance`
- **Ranking Bonus Status:** `http://localhost:8000/api/ranking-bonus/distribute`
- **Ranking History:** `http://localhost:8000/api/ranking-bonus/history`
- **Maintenance Status:** `http://localhost:8000/api/ranking-bonus/maintenance`

---

## 🤝 **Partner Wallet System Testing**

### **What to Look For:**
1. **Partner Wallet Card** should display:
   - ✅ Current commission balance
   - ✅ "Transfer to Main Wallet" button
   - ✅ Commission earnings summary
   - ✅ Recent commission history

### **Expected Behavior:**
- **Commission Source:** Daily referral commissions from VIP accounts
- **Balance Display:** Shows accumulated commission earnings
- **Transfer Function:** Allows moving funds to main wallet
- **Real-time Updates:** Balance updates when commissions are earned

### **Test Actions:**
1. **Check Balance Display:** Verify partner wallet balance shows correctly
2. **View Commission History:** Check if commission transactions are listed
3. **Test Transfer Function:** Try transferring funds (if balance > 0)
4. **Verify Real-time Updates:** Check if balance updates automatically

---

## 🏆 **Ranking Bonus System Testing**

### **What to Look For:**
1. **Ranking Bonus Card** should display:
   - ✅ Current rank (Bronze, Silver, Gold, Platinum, Diamond)
   - ✅ Monthly bonus amount
   - ✅ Qualification status
   - ✅ "Claim Bonus" button (if eligible)
   - ✅ TIC/GIC token amounts (50/50 split)

2. **Ranking Maintenance Card** should display:
   - ✅ Monthly qualification tracking
   - ✅ Qualification history
   - ✅ Missing requirements alerts
   - ✅ Performance analytics

### **Expected Behavior:**
- **Token Destination:** TIC/GIC tokens go to Main Wallet (My Assets)
- **Qualification Check:** Monthly requirements must be maintained
- **Bonus Distribution:** 50% TIC + 50% GIC tokens
- **History Tracking:** Complete transaction history with rank sources

### **Test Actions:**
1. **Check Current Rank:** Verify rank calculation based on referrals
2. **View Qualification Status:** Check if requirements are met
3. **Test Bonus Claiming:** Try claiming bonus (if qualified)
4. **Verify Token Distribution:** Check if TIC/GIC balances update
5. **Review History:** Check transaction history shows rank sources

---

## 📊 **Wallet Separation Verification**

### **Key Distinctions to Verify:**

#### **🤝 Partner Wallet (Commissions)**
- **Source:** Daily referral commissions ($0.44 per VIP account)
- **Rates:** 10% Level 1, 5% Level 2, etc.
- **Display:** Shows dollar amounts
- **Management:** Transfer to main wallet option
- **Purpose:** Daily earning accumulation

#### **🏆 Main Wallet (Ranking Bonuses)**
- **Source:** Monthly ranking achievements
- **Amounts:** $690 - $14,904 based on rank
- **Display:** Shows TIC/GIC token amounts
- **Management:** Direct credit to "My Assets"
- **Purpose:** Achievement-based rewards

### **Verification Checklist:**
- ✅ **Separate Display:** Two distinct wallet sections
- ✅ **Different Sources:** Clear labeling of income sources
- ✅ **Proper Routing:** Commissions → Partner, Bonuses → Main
- ✅ **Transaction History:** Different transaction types clearly marked

---

## 🔍 **Detailed Testing Steps**

### **Step 1: Initial Page Load**
1. Navigate to `http://localhost:8000/referrals`
2. Verify page loads without errors
3. Check that both wallet sections are visible
4. Confirm all components render properly

### **Step 2: Partner Wallet Testing**
1. **Balance Check:** Verify partner wallet balance displays
2. **Commission History:** Check if commission transactions show
3. **Transfer Function:** Test transfer to main wallet (if applicable)
4. **Real-time Updates:** Verify live balance updates

### **Step 3: Ranking Bonus Testing**
1. **Qualification Check:** Verify current rank and requirements
2. **Bonus Calculation:** Check if bonus amounts are correct
3. **Token Distribution:** Test bonus claiming (if qualified)
4. **History Review:** Verify transaction history accuracy

### **Step 4: Integration Testing**
1. **Navigation:** Test all page navigation elements
2. **Real-time Updates:** Verify WebSocket connections work
3. **Error Handling:** Test with invalid inputs
4. **Responsive Design:** Check mobile/desktop layouts

### **Step 5: API Testing**
1. **Authentication:** Verify all endpoints require login
2. **Data Accuracy:** Check API responses match UI display
3. **Error Responses:** Test with invalid requests
4. **Performance:** Verify reasonable response times

---

## 🚨 **Common Issues to Watch For**

### **Potential Problems:**
1. **Authentication Errors:** User not logged in
2. **Database Connection:** Supabase connection issues
3. **Component Errors:** React component rendering issues
4. **API Failures:** Backend endpoint errors
5. **Wallet Confusion:** Mixing up partner vs. main wallet

### **Troubleshooting:**
1. **Check Browser Console:** Look for JavaScript errors
2. **Verify Authentication:** Ensure user is logged in
3. **Check Network Tab:** Verify API calls are successful
4. **Review Database:** Confirm data exists in Supabase
5. **Test Components:** Use `/test-components` page for isolation

---

## ✅ **Success Criteria**

### **Partnership Page Should:**
- ✅ **Load Successfully:** No errors or crashes
- ✅ **Show Dual Wallets:** Clear separation between commission and bonus systems
- ✅ **Display Accurate Data:** Correct balances, ranks, and history
- ✅ **Handle Interactions:** Buttons and forms work properly
- ✅ **Update Real-time:** Live updates for balance changes
- ✅ **Maintain Security:** Proper authentication and data isolation

### **User Experience Should:**
- ✅ **Be Intuitive:** Clear understanding of different earning sources
- ✅ **Provide Feedback:** Toast notifications and status updates
- ✅ **Show Progress:** Qualification tracking and requirements
- ✅ **Enable Actions:** Claiming bonuses and transferring funds
- ✅ **Maintain History:** Complete transaction tracking

---

## 🎉 **Testing Complete!**

Once you've verified all the above functionality, the partnership page testing is complete. The dual-wallet system should provide users with:

1. **Clear Income Separation:** Commissions vs. ranking bonuses
2. **Comprehensive Tracking:** Complete history and analytics
3. **User-Friendly Interface:** Intuitive design and navigation
4. **Real-time Updates:** Live balance and status changes
5. **Secure Operations:** Proper authentication and data protection

**🚀 The partnership page is ready for production use with the complete dual-wallet system!**
