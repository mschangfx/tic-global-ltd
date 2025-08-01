# Verification Policy - TIC Global

## 🎯 **Business Logic**

### **Deposits: No Verification Required** ✅
- **Goal**: Make it easy for users to add funds
- **Requirements**: Basic authentication only
- **Rationale**: Encourage deposits, reduce friction

### **Withdrawals: Full Verification Required** 🔒
- **Goal**: Secure funds and comply with regulations
- **Requirements**: Email + Phone + Identity verification
- **Rationale**: Prevent fraud, meet KYC/AML requirements

## 🔧 **Current Implementation Status**

### **✅ Deposits (COMPLETED)**
- ✅ Basic authentication check only
- ✅ No email verification required
- ✅ No phone verification required
- ✅ No identity verification required
- ✅ Users can deposit immediately after registration

### **🚧 Withdrawals (TO BE IMPLEMENTED)**
**Required verification checks for withdrawals:**

1. **Email Verification**
   ```typescript
   if (!user.email_confirmed_at) {
     throw new Error('Please verify your email before withdrawing');
   }
   ```

2. **Phone Verification**
   ```typescript
   if (!user.phone_verified) {
     throw new Error('Please verify your phone number before withdrawing');
   }
   ```

3. **Identity Verification (KYC)**
   ```typescript
   if (user.identity_verification_status !== 'approved') {
     throw new Error('Please complete identity verification before withdrawing');
   }
   ```

4. **Withdrawal Limits Based on Verification**
   ```typescript
   const getWithdrawalLimit = (user) => {
     if (user.identity_verification_status === 'approved') return 50000;
     if (user.phone_verified) return 5000;
     if (user.email_confirmed_at) return 1000;
     return 0; // No withdrawals without verification
   };
   ```

## 📋 **Implementation Checklist for Withdrawals**

### **Backend APIs to Update:**
- [ ] `src/app/api/withdrawals/route.ts` - Add verification checks
- [ ] `src/app/api/user/withdrawals/route.ts` - Enforce verification
- [ ] `src/app/api/withdrawals/validate/route.ts` - Validation logic

### **Frontend Pages to Update:**
- [ ] `src/app/(dashboard)/wallet/withdrawal/page.tsx` - Add verification UI
- [ ] Add verification status indicators
- [ ] Add verification completion flow
- [ ] Add withdrawal limit displays

### **Database Updates:**
- [ ] Add withdrawal limits to user profiles
- [ ] Track verification completion dates
- [ ] Log verification-related withdrawal rejections

### **User Experience:**
- [ ] Clear verification requirements display
- [ ] Step-by-step verification guide
- [ ] Progress indicators for verification status
- [ ] Helpful error messages with next steps

## 🎯 **Key Benefits**

### **For Business:**
- ✅ **Increased deposits** - No friction for adding funds
- ✅ **Regulatory compliance** - Secure withdrawal process
- ✅ **Fraud prevention** - Verified users only for withdrawals
- ✅ **Risk management** - Tiered limits based on verification

### **For Users:**
- ✅ **Easy onboarding** - Can start depositing immediately
- ✅ **Clear expectations** - Know what's needed for withdrawals
- ✅ **Progressive verification** - Complete at their own pace
- ✅ **Higher limits** - Rewards for completing verification

## 🚀 **Next Steps**

1. **Complete deposit system testing** ✅
2. **Implement withdrawal verification system** 🚧
3. **Add verification status dashboard** 📋
4. **Create verification completion flow** 🔄
5. **Test end-to-end user journey** 🧪
