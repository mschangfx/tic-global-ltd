'use client';

import { useState, useEffect } from 'react';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'ticadmin',
  password: 'TICGlobal2024!Admin'
};

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  type: 'deposit' | 'withdrawal';
  network?: string;
  destination_address?: string;
}

interface Stats {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalPending: number;
  todayTransactions: number;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalPending: 0,
    todayTransactions: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      loadData();
    } else {
      alert('❌ Invalid credentials. Please check your username and password.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        
        // Calculate stats
        const deposits = data.transactions.filter((t: Transaction) => t.type === 'deposit');
        const withdrawals = data.transactions.filter((t: Transaction) => t.type === 'withdrawal');
        const today = new Date().toDateString();
        const todayTxns = data.transactions.filter((t: Transaction) => 
          new Date(t.created_at).toDateString() === today
        );

        setStats({
          pendingDeposits: deposits.length,
          pendingWithdrawals: withdrawals.length,
          totalPending: data.transactions.length,
          todayTransactions: todayTxns.length
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('❌ Error loading data. Please try again.');
    }
    setLoading(false);
  };

  const handleTransaction = async (id: string, action: 'approve' | 'reject', type: 'deposit' | 'withdrawal') => {
    if (!confirm(`Are you sure you want to ${action} this ${type}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, type }),
      });

      if (response.ok) {
        alert(`✅ Transaction ${action}d successfully!`);
        loadData(); // Reload data
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      alert(`❌ Network error. Please try again.`);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'deposits') return t.type === 'deposit';
    if (activeTab === 'withdrawals') return t.type === 'withdrawal';
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-card" style={{ maxWidth: '400px' }}>
          <div className="admin-header">
            <h1>🔐 TIC Global Admin Panel</h1>
            <p>Secure Administrative Access</p>
          </div>
          <div className="admin-content">
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">👤 Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">🔑 Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                🚀 Login to Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>⚡ TIC Global Admin Panel</h1>
              <p>Transaction Management System</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadData} 
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="btn btn-danger"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

        <div className="admin-content">
          {/* Stats Dashboard */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalPending}</div>
              <div className="stat-label">📋 Total Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pendingDeposits}</div>
              <div className="stat-label">💰 Pending Deposits</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pendingWithdrawals}</div>
              <div className="stat-label">💸 Pending Withdrawals</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.todayTransactions}</div>
              <div className="stat-label">📅 Today's Transactions</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ marginBottom: '20px', borderBottom: '2px solid #ecf0f1' }}>
            <div style={{ display: 'flex', gap: '0' }}>
              {[
                { key: 'all', label: '📋 All Transactions', count: stats.totalPending },
                { key: 'deposits', label: '💰 Deposits', count: stats.pendingDeposits },
                { key: 'withdrawals', label: '💸 Withdrawals', count: stats.pendingWithdrawals }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: activeTab === tab.key ? '#3498db' : 'transparent',
                    color: activeTab === tab.key ? 'white' : '#7f8c8d',
                    cursor: 'pointer',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: '600'
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="loading">
              <h3>🔄 Loading transactions...</h3>
              <p>Please wait while we fetch the latest data.</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>✅ No pending transactions</h3>
              <p>All transactions have been processed.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                        {transaction.type === 'deposit' ? '💰' : '💸'} {transaction.type.toUpperCase()}
                      </h3>
                      <span className="status-badge status-pending">⏳ PENDING</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>
                        ${transaction.amount} {transaction.currency}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                        {new Date(transaction.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-2" style={{ marginBottom: '15px' }}>
                    <div>
                      <strong>👤 User:</strong> {transaction.user_email}
                    </div>
                    <div>
                      <strong>🆔 Transaction ID:</strong> {transaction.id.substring(0, 8)}...
                    </div>
                    {transaction.network && (
                      <div>
                        <strong>🌐 Network:</strong> {transaction.network}
                      </div>
                    )}
                    {transaction.destination_address && (
                      <div>
                        <strong>🏦 Destination:</strong> {transaction.destination_address.substring(0, 20)}...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleTransaction(transaction.id, 'approve', transaction.type)}
                      className="btn btn-success"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleTransaction(transaction.id, 'reject', transaction.type)}
                      className="btn btn-danger"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
