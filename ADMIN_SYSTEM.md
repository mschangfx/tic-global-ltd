# 🛡️ TIC Global Admin System

A comprehensive admin dashboard for managing deposits, withdrawals, and users instead of using Supabase directly.

## 🚀 **Features**

### **📊 Admin Dashboard**
- **Real-time Statistics**: View pending deposits, withdrawals, and user activity
- **Quick Actions**: Direct access to management pages
- **Visual Overview**: Charts and metrics for admin insights

### **💰 Deposit Management**
- **View All Deposits**: Filter by status, network, date, and user
- **Approve/Reject**: Process pending deposits with admin notes
- **Transaction Details**: Complete deposit information and proof
- **Bulk Actions**: Handle multiple deposits efficiently

### **💸 Withdrawal Management**
- **Process Withdrawals**: Approve or reject withdrawal requests
- **Automatic Refunds**: Rejected withdrawals automatically refund users
- **Method Support**: Handle TRC20, BEP20, Polygon, GCash, PayMaya
- **Notification System**: Users get notified of status changes

### **👥 User Management**
- **User Overview**: View all registered users and their stats
- **Account Details**: Access user balances, transaction history
- **Verification Status**: Monitor email verification status
- **Search & Filter**: Find users by email, name, or verification status

## 🔐 **Admin Access**

### **Admin Users**
Currently configured admin emails:
- `admin@ticgloballtd.com`
- `mschangfx@gmail.com`
- Any email containing "admin"

### **Admin Navigation**
Admin users see additional navigation items:
- 🛡️ **Admin Dashboard** (`/admin`)
- 📥 **Manage Deposits** (`/admin/deposits`)
- 📤 **Manage Withdrawals** (`/admin/withdrawals`)
- 👥 **Manage Users** (`/admin/users`)

## 📱 **How to Use**

### **1. Access Admin Panel**
1. Login with an admin email
2. Navigate to the dashboard
3. Look for the red "🛡️ Admin Panel" section in the sidebar

### **2. Manage Deposits**
1. Go to **Admin Dashboard** → **Manage Deposits**
2. Filter by status (pending, approved, rejected)
3. Click "View Details" on any deposit
4. Add admin notes and approve/reject

### **3. Manage Withdrawals**
1. Go to **Admin Dashboard** → **Manage Withdrawals**
2. View pending withdrawal requests
3. Click "View Details" to see withdrawal information
4. Approve or reject with optional admin notes
5. Rejected withdrawals automatically refund users

### **4. Manage Users**
1. Go to **Admin Dashboard** → **Manage Users**
2. View user statistics and account details
3. Search users by email or name
4. Filter by verification status

## 🔧 **API Endpoints**

### **Admin Authentication**
All admin APIs require authentication via `requireAdmin()` middleware.

### **Deposits**
- `GET /api/admin/deposits` - List deposits with filters
- `PATCH /api/admin/deposits/[id]` - Update deposit status

### **Withdrawals**
- `GET /api/admin/withdrawals` - List withdrawals with filters
- `GET /api/admin/withdrawals/[id]` - Get withdrawal details
- `PATCH /api/admin/withdrawals/[id]` - Approve/reject withdrawal

### **Users**
- `GET /api/admin/users` - List users with stats
- `POST /api/admin/users` - Admin actions (verify, suspend)

## 🛠️ **Technical Details**

### **Authentication System**
- **File**: `src/lib/admin-auth.ts`
- **Function**: `requireAdmin()` - Protects admin routes
- **Check**: `isAdminEmail()` - Validates admin emails
- **Session**: Uses NextAuth for authentication

### **Database Access**
- **Service Role**: Uses Supabase service role key for admin operations
- **Bypass RLS**: Admin operations bypass Row Level Security
- **Full Access**: Can read/write all user data

### **Security Features**
- **Route Protection**: All admin APIs require authentication
- **Email Validation**: Only specific emails can access admin features
- **Audit Trail**: All admin actions are logged
- **Session Management**: Secure admin session handling

## 🎯 **Benefits Over Supabase Direct Access**

### **✅ User-Friendly Interface**
- **Visual Dashboard**: Easy-to-use web interface
- **No SQL Required**: Point-and-click operations
- **Real-time Updates**: Live data without manual refresh

### **✅ Better Security**
- **Controlled Access**: Only authorized admins can access
- **Action Logging**: Track all admin activities
- **Validation**: Built-in checks and confirmations

### **✅ Enhanced Features**
- **Automatic Notifications**: Users get notified of changes
- **Bulk Operations**: Handle multiple items at once
- **Smart Filtering**: Advanced search and filter options
- **Mobile Responsive**: Works on all devices

### **✅ Business Logic**
- **Automatic Refunds**: Rejected withdrawals refund users
- **Status Management**: Proper workflow for approvals
- **Data Validation**: Ensures data integrity

## 🚀 **Getting Started**

### **1. Admin Setup**
1. Add your email to `ADMIN_EMAILS` in `src/lib/admin-auth.ts`
2. Login to the application
3. Navigate to `/admin` to access the dashboard

### **2. Environment Variables**
Ensure these are set in your environment:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **3. Database Permissions**
The service role key should have full access to:
- `wallet_transactions` table
- `user_wallets` table
- `users` table
- `notifications` table

## 📞 **Support**

For admin system support or to add new admin users, contact the development team.

## 🚀 **DEPLOYMENT STATUS**

### **✅ SUCCESSFULLY DEPLOYED!**

**Production URL**: https://tic-global-1ytc74imf-changs-projects-b6f8a2cc.vercel.app

### **📱 Live Admin Pages:**
- **🛡️ Admin Dashboard**: `/admin`
- **📥 Manage Deposits**: `/admin/deposits`
- **📤 Manage Withdrawals**: `/admin/withdrawals`
- **👥 Manage Users**: `/admin/users`
- **🧪 Admin Test**: `/admin/test` (for debugging)

### **🔧 Live Admin APIs:**
- **GET** `/api/admin/deposits` - List deposits with filters
- **PATCH** `/api/admin/deposits/[id]` - Update deposit status
- **GET** `/api/admin/withdrawals` - List withdrawals with filters
- **GET/PATCH** `/api/admin/withdrawals/[id]` - Get/update withdrawal details
- **GET/POST** `/api/admin/users` - List users and admin actions
- **GET** `/api/debug/admin-auth` - Debug authentication

### **🎯 Current Status:**
- ✅ **Build**: Successful deployment to Vercel
- ✅ **Pages**: All admin pages built and accessible
- ✅ **APIs**: All admin endpoints deployed
- ✅ **Authentication**: Flexible admin auth system
- ✅ **Database**: Service role key configured
- ✅ **UI**: Responsive admin interface

### **🔐 Admin Access:**
1. **Login** with admin email (`mschangfx@gmail.com` or `admin@ticgloballtd.com`)
2. **Navigate** to `/admin` to access the dashboard
3. **Use** the red "🛡️ Admin Panel" section in the sidebar

---

**🎉 The admin system provides a complete alternative to Supabase direct access with enhanced security, better UX, and automated business logic!**
