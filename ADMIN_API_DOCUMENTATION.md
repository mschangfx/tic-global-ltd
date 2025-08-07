# TIC Global Admin API Documentation

## 🔐 Authentication
All API calls require the admin key: `admin_key_2024_tic_global`

## 🌐 Base URL
```
https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app
```

## 📋 Available Endpoints

### 1. 📊 Get Statistics
**GET** `/api/admin-actions?key=admin_key_2024_tic_global&action=stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "pendingDeposits": 3,
    "pendingWithdrawals": 5,
    "totalUsers": 150
  }
}
```

### 2. 💰 Get Pending Deposits
**GET** `/api/admin-actions?key=admin_key_2024_tic_global&action=pending-deposits`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dep_123",
      "user_email": "user@example.com",
      "amount": 500,
      "currency": "USD",
      "method_id": "bank_transfer",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z",
      "type": "deposit"
    }
  ],
  "count": 1,
  "message": "Found 1 pending deposits"
}
```

### 3. 💸 Get Pending Withdrawals
**GET** `/api/admin-actions?key=admin_key_2024_tic_global&action=pending-withdrawals`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "with_456",
      "user_email": "user@example.com",
      "amount": 750,
      "currency": "USD",
      "method_id": "crypto",
      "destination_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "status": "pending",
      "created_at": "2024-01-15T11:00:00Z",
      "type": "withdrawal"
    }
  ],
  "count": 1,
  "message": "Found 1 pending withdrawals"
}
```

### 4. ✅ Approve Transaction
**POST** `/api/admin-actions`

**Request Body:**
```json
{
  "key": "admin_key_2024_tic_global",
  "action": "update-transaction",
  "transactionId": "dep_123",
  "transactionType": "deposit",
  "status": "approved",
  "adminNotes": "Approved - documentation verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deposit approved successfully",
  "data": {
    "id": "dep_123",
    "status": "approved",
    "processed_at": "2024-01-15T12:00:00Z"
  }
}
```

### 5. ❌ Reject Transaction
**POST** `/api/admin-actions`

**Request Body:**
```json
{
  "key": "admin_key_2024_tic_global",
  "action": "update-transaction",
  "transactionId": "with_456",
  "transactionType": "withdrawal",
  "status": "rejected",
  "adminNotes": "Rejected - insufficient documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal rejected successfully",
  "data": {
    "id": "with_456",
    "status": "rejected",
    "processed_at": "2024-01-15T12:05:00Z"
  }
}
```

## 🔧 How to Use

### Option 1: HTML Admin Panel
Visit: `/admin-simple.html`
- Visual interface with buttons
- Click to approve/reject transactions
- Real-time updates

### Option 2: Postman/API Tool
1. Import the provided Postman collection
2. Use the pre-configured requests
3. Replace transaction IDs with real ones

### Option 3: cURL Commands

**Get pending deposits:**
```bash
curl "https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app/api/admin-actions?key=admin_key_2024_tic_global&action=pending-deposits"
```

**Approve a deposit:**
```bash
curl -X POST "https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app/api/admin-actions" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "admin_key_2024_tic_global",
    "action": "update-transaction",
    "transactionId": "ACTUAL_DEPOSIT_ID",
    "transactionType": "deposit",
    "status": "approved",
    "adminNotes": "Approved via cURL"
  }'
```

## 🚨 Error Responses

**Invalid admin key:**
```json
{
  "error": "Invalid admin key"
}
```

**Invalid action:**
```json
{
  "error": "Invalid action"
}
```

**Database error:**
```json
{
  "success": false,
  "error": "Failed to fetch deposits"
}
```

## 📝 Transaction Types
- `deposit` - For deposit transactions
- `withdrawal` - For withdrawal transactions

## 📝 Transaction Statuses
- `pending` - Awaiting admin approval
- `approved` - Approved by admin
- `rejected` - Rejected by admin

## 🔄 Workflow

1. **Check Statistics** - Get overview of pending transactions
2. **Get Pending Items** - List all pending deposits/withdrawals
3. **Review Details** - Check user, amount, method, etc.
4. **Take Action** - Approve or reject with admin notes
5. **Verify** - Check that status was updated

## 🛡️ Security Notes

- Admin key is required for all operations
- All actions are logged with timestamps
- Admin notes are stored for audit trail
- Service role key used for database access
