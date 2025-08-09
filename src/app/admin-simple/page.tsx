'use client';

import { useState } from 'react';

// Simple admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'TIC2024Admin!';

export default function SimpleAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadTransactions();
    } else {
      alert('Invalid credentials');
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Call our API to get transactions
      const response = await fetch('/api/admin/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        console.error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setLoading(false);
  };

  const handleTransaction = async (id: string, action: 'approve' | 'reject', type: 'deposit' | 'withdrawal') => {
    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action, type }),
      });

      if (response.ok) {
        alert(`Transaction ${action}d successfully!`);
        loadTransactions(); // Reload transactions
      } else {
        alert(`Error ${action}ing transaction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      alert(`Error ${action}ing transaction`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
            TIC Global Admin
          </h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>TIC Global Admin Control</h1>
          <div>
            <button
              onClick={loadTransactions}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                marginRight: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>
            Pending Transactions ({transactions.length})
          </h2>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No pending transactions</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {transactions.map((transaction: any) => (
                <div
                  key={transaction.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Type:</strong> {transaction.type}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>User:</strong> {transaction.user_email}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Amount:</strong> ${transaction.amount} {transaction.currency}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Date:</strong> {new Date(transaction.created_at).toLocaleString()}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>ID:</strong> {transaction.id.substring(0, 8)}...
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleTransaction(transaction.id, 'approve', transaction.type)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleTransaction(transaction.id, 'reject', transaction.type)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
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
  );
}
