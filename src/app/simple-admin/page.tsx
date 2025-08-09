'use client';

import { useState, useEffect } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const ADMIN_CREDENTIALS = {
  username: 'ticadmin',
  password: 'TICGlobal2024!Admin'
};

const SUPABASE_URL = 'https://clsowgswufspftizyjlc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsc293Z3N3dWZzcGZ0aXp5amxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2OTQxODAsImV4cCI6MjA2NDI3MDE4MH0.8q5bAO2_-8tMa7WLgVawMhr2SjCyljSxvk6qrHhq08I';

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  type: 'deposit' | 'withdrawal';
}

export default function SimpleAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      loadTransactions();
    } else {
      alert('❌ Invalid credentials');
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const [depositsResponse, withdrawalsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/deposits?status=eq.pending&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests?status=eq.pending&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const deposits = await depositsResponse.json();
      const withdrawals = await withdrawalsResponse.json();

      const allTransactions = [
        ...deposits.map((d: any) => ({ ...d, type: 'deposit' })),
        ...withdrawals.map((w: any) => ({ ...w, type: 'withdrawal' }))
      ];

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('❌ Error loading transactions');
    }
    setLoading(false);
  };

  const handleTransaction = async (id: string, action: 'approve' | 'reject', type: 'deposit' | 'withdrawal') => {
    if (!confirm(`Are you sure you want to ${action} this ${type}?`)) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: `${action === 'approve' ? 'Approved' : 'Rejected'} via simple admin at ${timestamp}`,
        updated_at: timestamp
      };

      const tableName = type === 'deposit' ? 'deposits' : 'withdrawal_requests';
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        alert(`✅ Transaction ${action}d successfully!`);
        loadTransactions();
      } else {
        alert(`❌ Error ${action}ing transaction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      alert(`❌ Network error`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🔐 TIC Global Admin</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Simple Admin Panel</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                👤 Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ecf0f1',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter admin username"
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                🔑 Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ecf0f1',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              🚀 Login to Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            color: 'white',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '5px' }}>⚡ TIC Global Admin Panel</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>Transaction Management System</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadTransactions} 
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
              <button 
                onClick={() => setIsAuthenticated(false)}
                style={{
                  padding: '10px 20px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>

          <div style={{ padding: '30px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #3498db',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  {transactions.length}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '0.9rem', marginTop: '5px' }}>
                  📋 Total Pending
                </div>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #27ae60',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  {transactions.filter(t => t.type === 'deposit').length}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '0.9rem', marginTop: '5px' }}>
                  💰 Pending Deposits
                </div>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #e74c3c',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  {transactions.filter(t => t.type === 'withdrawal').length}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '0.9rem', marginTop: '5px' }}>
                  💸 Pending Withdrawals
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <h3>🔄 Loading transactions...</h3>
                <p>Please wait while we fetch the latest data.</p>
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6c757d' }}>
                <h3>✅ No pending transactions</h3>
                <p>All transactions have been processed.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '20px',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: '15px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                          {transaction.type === 'deposit' ? '💰' : '💸'} {transaction.type.toUpperCase()}
                        </h3>
                        <span style={{
                          background: '#fff3cd',
                          color: '#856404',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ⏳ PENDING
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>
                          ${transaction.amount} {transaction.currency || 'USD'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                          {new Date(transaction.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div><strong>👤 User:</strong> {transaction.user_email}</div>
                      <div><strong>🆔 ID:</strong> {transaction.id.substring(0, 8)}...</div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleTransaction(transaction.id, 'approve', transaction.type)}
                        style={{
                          padding: '8px 16px',
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleTransaction(transaction.id, 'reject', transaction.type)}
                        style={{
                          padding: '8px 16px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
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
    </div>
  );
}
