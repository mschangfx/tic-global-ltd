# 🛡️ TIC Global Secure Admin Access Instructions

## 📋 Overview
This document explains how to access and use the secure admin dashboard for managing TIC Global deposits and withdrawals.

## 🔐 Admin Access Requirements

### **Who Can Access Admin Dashboard:**
Only accounts with these email addresses can access the admin dashboard:
- `admin@ticgloballtd.com`
- `support@ticgloballtd.com`
- `mschangfx@gmail.com`
- `client@ticgloballtd.com`
- `manager@ticgloballtd.com`

### **Authentication Method:**
- Uses Google OAuth login (same as regular user login)
- No separate admin password needed
- Account-based authorization system

## 🚀 How to Access Admin Dashboard

### **Step 1: Login with Google**
1. Go to: https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app/join
2. Click "Continue with Google"
3. Login with your authorized admin email account

### **Step 2: Access Admin Dashboard**
1. After logging in, go to: https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app/secure-admin
2. If your account is authorized, you'll see the admin dashboard
3. If not authorized, you'll see an "Access Denied" message

## 📊 Admin Dashboard Features

### **Quick Actions:**
- **Load Pending Withdrawals** - Shows all withdrawal requests awaiting approval
- **Load Pending Deposits** - Shows all deposit requests awaiting approval
- **Refresh** - Updates the transaction list
- **Logout** - Signs out of admin session

### **Statistics Display:**
- Pending Withdrawals count
- Pending Deposits count  
- Total Pending transactions

### **Transaction Management:**
- View all pending transactions in a table
- See user email, amount, currency, method, and date
- Click "Review" to approve or reject transactions
- Add admin notes for each action

## 🔧 How to Manage Transactions

### **Approving a Transaction:**
1. Click "Load Pending Withdrawals" or "Load Pending Deposits"
2. Find the transaction you want to review
3. Click the "Review" button
4. Review all transaction details
5. Add admin notes (optional but recommended)
6. Click "Approve" button
7. Transaction status will be updated to "approved"

### **Rejecting a Transaction:**
1. Follow steps 1-4 above
2. Add admin notes explaining the rejection reason
3. Click "Reject" button
4. Transaction status will be updated to "rejected"

## 🔒 Security Features

### **Account-Based Access:**
- Only pre-approved email accounts can access admin functions
- Uses existing Google OAuth authentication
- No shared passwords or separate login systems

### **Audit Trail:**
- All admin actions are logged with the admin's email address
- Admin notes are saved with each transaction
- Timestamps recorded for all actions

### **Secure API:**
- All admin operations use secure API endpoints
- Session validation on every request
- Direct database operations with service role permissions

## 🚨 Troubleshooting

### **"Access Denied" Error:**
- Verify you're logged in with an authorized admin email
- Contact the developer to add your email to the allowed list
- Make sure you're using the correct Google account

### **"Database Error" Messages:**
- Try refreshing the page
- Check your internet connection
- Contact the developer if errors persist

### **No Transactions Showing:**
- Click "Load Pending Withdrawals" to refresh the list
- Verify there are actually pending transactions in the system
- Check that you're looking at the correct status (pending)

## 📞 Support

If you encounter any issues or need additional admin accounts added:
- Contact the developer who set up this system
- Provide the exact email address that needs admin access
- Include screenshots of any error messages

## 🔄 Regular Admin Tasks

### **Daily Routine:**
1. Login to admin dashboard
2. Load pending withdrawals and deposits
3. Review each transaction carefully
4. Approve legitimate transactions
5. Reject suspicious or invalid transactions
6. Add detailed notes for all actions

### **Best Practices:**
- Always add admin notes explaining your decision
- Verify user email addresses match transaction details
- Check amounts and currencies are reasonable
- Be cautious with large transactions
- Document any unusual patterns or concerns

---

**Admin Dashboard URL:** https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app/secure-admin

**Last Updated:** December 2024
