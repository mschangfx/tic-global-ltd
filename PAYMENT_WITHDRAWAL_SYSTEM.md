# 💳 Complete Payment & Withdrawal System with Supabase

## 📋 Overview

The complete payment and withdrawal backend system is now implemented using Supabase database with comprehensive APIs, database functions, and wallet management. All operations are database-backed with proper transaction handling and audit trails.

## ✅ **System Components:**

### **🗄️ Database Schema:**

#### **Core Tables:**
```sql
-- Payment methods (crypto, bank, card, digital)
payment_methods (
    id, method_id, name, type, network, symbol,
    min_amount, max_amount, processing_fee_rate,
    fixed_fee, processing_time, is_active, metadata
)

-- Withdrawal requests tracking
withdrawal_requests (
    id, user_email, transaction_id, method_id,
    destination_address, amount, currency, network,
    processing_fee, network_fee, final_amount,
    status, admin_notes, processed_by, blockchain_hash
)

-- Payment plans and subscriptions
payment_plans (
    id, plan_id, name, description, price, currency,
    duration_days, features, is_active, sort_order
)

-- User plan subscriptions
user_plan_subscriptions (
    id, user_email, plan_id, transaction_id, status,
    started_at, expires_at, auto_renew, payment_amount
)

-- Enhanced user wallets
user_wallets (
    id, user_email, total_balance, tic_balance,
    gic_balance, staking_balance, pending_deposits,
    pending_withdrawals, last_updated
)

-- Wallet transaction history
wallet_transactions (
    id, user_email, transaction_id, transaction_type,
    amount, balance_before, balance_after, description
)
```

#### **Database Functions:**
```sql
-- Payment processing
process_plan_payment(user_email, plan_id, amount, transaction_id)

-- Withdrawal processing
process_withdrawal_request(user_email, method_id, address, amount, transaction_id)

-- Wallet management
credit_user_wallet(user_email, amount, transaction_id, description)
debit_user_wallet(user_email, amount, transaction_id, type, description)

-- Statistics and reporting
get_user_active_subscriptions(user_email)
get_withdrawal_stats()
approve_withdrawal(withdrawal_id, admin_email, blockchain_hash, notes)
```

## 🚀 **API Endpoints:**

### **💰 Payment APIs:**

#### **GET /api/payments**
```typescript
// Get available payment plans
GET /api/payments
// Response: { success: true, plans: [...], count: 3 }

// Get specific plan
GET /api/payments?planId=premium
// Response: { success: true, plan: {...} }
```

#### **POST /api/payments**
```typescript
// Process plan payment
POST /api/payments
{
  "planId": "premium",
  "userEmail": "user@example.com"
}
// Response: { success: true, message: "Payment successful!", transaction: {...}, wallet: {...} }
```

### **👤 User Subscription APIs:**

#### **GET /api/user/subscriptions**
```typescript
// Get user's subscriptions and payment history
GET /api/user/subscriptions?status=active&limit=20
// Response: {
//   success: true,
//   active_subscriptions: [...],
//   payment_history: [...],
//   statistics: {...}
// }
```

#### **POST /api/user/subscriptions**
```typescript
// Subscribe to a plan
POST /api/user/subscriptions
{ "planId": "premium" }
// Response: { success: true, subscription: {...}, transaction: {...} }
```

#### **PUT /api/user/subscriptions**
```typescript
// Cancel/modify subscription
PUT /api/user/subscriptions
{
  "subscriptionId": "uuid",
  "action": "cancel",
  "reason": "No longer needed"
}
// Response: { success: true, message: "Subscription cancelled" }
```

### **💸 Withdrawal APIs:**

#### **GET /api/withdrawals**
```typescript
// Get withdrawal methods
GET /api/withdrawals?type=methods
// Response: { success: true, methods: [...] }

// Get user withdrawal history
GET /api/withdrawals?type=history&status=pending
// Response: {
//   success: true,
//   withdrawals: [...],
//   wallet: {...},
//   statistics: {...}
// }
```

#### **POST /api/withdrawals**
```typescript
// Create withdrawal request
POST /api/withdrawals
{
  "methodId": "usdt-trc20",
  "destinationAddress": "TXyz123...",
  "amount": 100.00
}
// Response: {
//   success: true,
//   withdrawal: {...},
//   transaction: {...},
//   wallet: {...}
// }
```

#### **PUT /api/withdrawals**
```typescript
// Cancel withdrawal request
PUT /api/withdrawals
{
  "withdrawalId": "uuid",
  "reason": "Changed mind"
}
// Response: { success: true, message: "Withdrawal cancelled and refunded" }
```

### **🔧 Admin Withdrawal Management:**

#### **GET /api/admin/withdrawals**
```typescript
// Get all withdrawals with filtering
GET /api/admin/withdrawals?status=pending&method=usdt-trc20&limit=50
// Response: {
//   success: true,
//   withdrawals: [...],
//   stats: {...},
//   pagination: {...}
// }
```

#### **POST /api/admin/withdrawals**
```typescript
// Bulk approve/reject withdrawals
POST /api/admin/withdrawals
{
  "withdrawalIds": ["uuid1", "uuid2"],
  "action": "approve",
  "adminEmail": "admin@example.com",
  "blockchainHashes": ["0x123...", "0x456..."]
}
// Response: { success: true, results: [...], summary: {...} }
```

#### **PUT /api/admin/withdrawals**
```typescript
// Update individual withdrawal
PUT /api/admin/withdrawals
{
  "withdrawalId": "uuid",
  "action": "complete",
  "adminEmail": "admin@example.com",
  "blockchainHash": "0x123...",
  "adminNotes": "Payment sent successfully"
}
// Response: { success: true, message: "Withdrawal completed" }
```

## 💳 **Enhanced Wallet Service:**

### **Updated Methods:**
```typescript
// Payment processing
async processPayment(planId: string, planName: string): Promise<{
  success: boolean;
  message: string;
  newBalance?: WalletBalance;
  transaction?: any;
}>

// Withdrawal processing
async processWithdrawal(amount: number, address: string, methodId: string): Promise<{
  success: boolean;
  message: string;
  newBalance?: WalletBalance;
  withdrawal?: any;
}>

// Data retrieval methods
async getActiveSubscriptions(): Promise<any[]>
async getPaymentHistory(limit?: number): Promise<any[]>
async getWithdrawalHistory(limit?: number): Promise<any[]>
async getWalletTransactions(limit?: number): Promise<any[]>
async getPaymentPlans(): Promise<any[]>
async getWithdrawalMethods(): Promise<any[]>
```

## 🔄 **Transaction Flows:**

### **Payment Flow:**
```
User selects plan → Check balance → Create transaction → 
Process payment → Debit wallet → Activate subscription → 
Update balance → Notify user
```

### **Withdrawal Flow:**
```
User requests withdrawal → Validate amount/address → 
Create withdrawal request → Debit wallet → 
Admin review → Approve/reject → Process payment → 
Update status → Notify user
```

### **Database Transaction Safety:**
- **Atomic Operations**: All wallet operations use database transactions
- **Rollback Protection**: Failed operations don't affect balances
- **Audit Trail**: Complete history of all balance changes
- **Concurrent Safety**: Database-level locking prevents race conditions

## 🔐 **Security Features:**

### **Payment Security:**
- **Balance Validation**: Insufficient balance checks
- **Plan Validation**: Active plan verification
- **User Authentication**: Email-based user identification
- **Transaction Logging**: Complete audit trail

### **Withdrawal Security:**
- **Address Validation**: Destination address verification
- **Amount Limits**: Min/max withdrawal limits
- **Admin Approval**: Manual review process
- **Refund Protection**: Automatic refunds for rejected withdrawals

### **Database Security:**
- **Parameterized Queries**: SQL injection prevention
- **Function-based Operations**: Controlled database access
- **Role-based Permissions**: Granular access control
- **Encrypted Storage**: Sensitive data protection

## 📊 **Monitoring & Analytics:**

### **Payment Analytics:**
- **Subscription Metrics**: Active/expired subscription counts
- **Revenue Tracking**: Total payments and plan popularity
- **User Behavior**: Payment patterns and preferences
- **Success Rates**: Payment completion rates

### **Withdrawal Analytics:**
- **Processing Times**: Average approval and completion times
- **Method Popularity**: Most used withdrawal methods
- **Volume Trends**: Daily/weekly withdrawal patterns
- **Success Rates**: Approval vs rejection rates

## 🚨 **Error Handling:**

### **Payment Errors:**
- **Insufficient Balance**: Clear error messages with shortfall amounts
- **Invalid Plans**: Plan not found or inactive errors
- **Processing Failures**: Automatic transaction rollback
- **Network Issues**: Retry mechanisms and fallbacks

### **Withdrawal Errors:**
- **Invalid Addresses**: Address format validation
- **Amount Violations**: Min/max limit enforcement
- **Method Unavailable**: Alternative method suggestions
- **Processing Failures**: Automatic refunds

## 🧪 **Testing:**

### **API Testing:**
```bash
# Test payment processing
curl -X POST /api/payments \
  -H "Content-Type: application/json" \
  -d '{"planId": "premium", "userEmail": "test@example.com"}'

# Test withdrawal request
curl -X POST /api/withdrawals \
  -H "Content-Type: application/json" \
  -d '{"methodId": "usdt-trc20", "destinationAddress": "TXyz...", "amount": 100}'

# Test admin withdrawal approval
curl -X PUT /api/admin/withdrawals \
  -H "Content-Type: application/json" \
  -d '{"withdrawalId": "uuid", "action": "approve", "adminEmail": "admin@example.com"}'
```

## 🔮 **Future Enhancements:**

1. **Blockchain Integration**: Real-time transaction verification
2. **Auto-Processing**: Automatic withdrawal processing for verified users
3. **Multi-Currency**: Support for multiple cryptocurrencies
4. **Recurring Payments**: Automatic subscription renewals
5. **Advanced Analytics**: Detailed reporting and insights

## 📞 **System Access:**

### **API Endpoints:**
- **Payments**: `/api/payments`
- **User Subscriptions**: `/api/user/subscriptions`
- **Withdrawals**: `/api/withdrawals`
- **Admin Withdrawals**: `/api/admin/withdrawals`

### **Database Functions:**
- **Payment Processing**: `process_plan_payment()`
- **Withdrawal Processing**: `process_withdrawal_request()`
- **Wallet Management**: `credit_user_wallet()`, `debit_user_wallet()`
- **Statistics**: `get_withdrawal_stats()`, `get_user_active_subscriptions()`

The complete payment and withdrawal system is now fully operational with Supabase backend, providing secure, scalable, and comprehensive financial transaction management!
