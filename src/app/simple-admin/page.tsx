'use client';

import { useState, useEffect } from 'react';

export default function SimpleAdmin() {
  const [activeView, setActiveView] = useState('dashboard');
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ pendingDeposits: 0, pendingWithdrawals: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(false);

  const ADMIN_KEY = 'admin_key_2024_tic_global';

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      const statsResponse = await fetch(`/api/admin-actions?key=${ADMIN_KEY}&action=stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || {});
      }

      // Load deposits
      const depositsResponse = await fetch(`/api/admin-actions?key=${ADMIN_KEY}&action=pending-deposits`);
      if (depositsResponse.ok) {
        const depositsData = await depositsResponse.json();
        setDeposits(depositsData.data || []);
      }

      // Load withdrawals
      const withdrawalsResponse = await fetch(`/api/admin-actions?key=${ADMIN_KEY}&action=pending-withdrawals`);
      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        setWithdrawals(withdrawalsData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle transaction action
  const handleTransaction = async (transactionId: string, transactionType: string, status: string) => {
    if (!confirm(`${status} this ${transactionType}?`)) return;

    try {
      const response = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: ADMIN_KEY,
          action: 'update-transaction',
          transactionId,
          transactionType,
          status,
          adminNotes: `${status} via simple admin panel`
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Transaction ${status} successfully!`);
        loadData(); // Reload data
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    },
    sidebar: {
      width: '280px',
      backgroundColor: '#fff',
      borderRight: '1px solid #e2e8f0',
      padding: '24px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '24px'
    },
    title: {
      color: '#e53e3e',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    email: {
      color: '#718096',
      fontSize: '14px',
      marginBottom: '8px'
    },
    badge: {
      backgroundColor: '#48bb78',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px'
    },
    navButton: {
      width: '100%',
      padding: '12px 16px',
      marginBottom: '8px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      color: '#4a5568',
      fontSize: '16px',
      cursor: 'pointer',
      textAlign: 'left'
    },
    activeButton: {
      backgroundColor: '#3182ce',
      color: 'white'
    },
    mainContent: {
      flex: 1,
      padding: '24px',
      backgroundColor: '#f7fafc'
    },
    alert: {
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '24px',
      fontWeight: 'bold'
    },
    successAlert: {
      backgroundColor: '#c6f6d5',
      color: '#22543d',
      border: '1px solid #9ae6b4'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '24px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: 'bold',
      margin: '8px 0'
    },
    table: {
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      borderCollapse: 'collapse' as const
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f7fafc',
      fontWeight: 'bold'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0'
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      marginRight: '8px'
    },
    approveBtn: {
      backgroundColor: '#38a169',
      color: 'white'
    },
    rejectBtn: {
      backgroundColor: '#e53e3e',
      color: 'white'
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'deposits':
        return (
          <div>
            <div style={{...styles.alert, ...styles.successAlert}}>
              ✅ MANAGE DEPOSITS ACTIVE - {deposits.length} pending deposits
            </div>
            <h2>Manage Deposits</h2>
            {deposits.length === 0 ? (
              <p>No pending deposits</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td style={styles.td}>{deposit.user_email}</td>
                      <td style={styles.td}>${deposit.amount} {deposit.currency}</td>
                      <td style={styles.td}>{deposit.method_id}</td>
                      <td style={styles.td}>{new Date(deposit.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <button
                          style={{...styles.button, ...styles.approveBtn}}
                          onClick={() => handleTransaction(deposit.id, 'deposit', 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          style={{...styles.button, ...styles.rejectBtn}}
                          onClick={() => handleTransaction(deposit.id, 'deposit', 'rejected')}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      case 'withdrawals':
        return (
          <div>
            <div style={{...styles.alert, ...styles.successAlert}}>
              ✅ MANAGE WITHDRAWALS ACTIVE - {withdrawals.length} pending withdrawals
            </div>
            <h2>Manage Withdrawals</h2>
            {withdrawals.length === 0 ? (
              <p>No pending withdrawals</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id}>
                      <td style={styles.td}>{withdrawal.user_email}</td>
                      <td style={styles.td}>${withdrawal.amount} {withdrawal.currency}</td>
                      <td style={styles.td}>{withdrawal.method_id}</td>
                      <td style={styles.td}>{new Date(withdrawal.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <button
                          style={{...styles.button, ...styles.approveBtn}}
                          onClick={() => handleTransaction(withdrawal.id, 'withdrawal', 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          style={{...styles.button, ...styles.rejectBtn}}
                          onClick={() => handleTransaction(withdrawal.id, 'withdrawal', 'rejected')}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      case 'users':
        return (
          <div>
            <div style={{...styles.alert, ...styles.successAlert}}>
              ✅ MANAGE USERS ACTIVE
            </div>
            <h2>Manage Users</h2>
            <p>User management features coming soon...</p>
          </div>
        );

      default:
        return (
          <div>
            <div style={{...styles.alert, ...styles.successAlert}}>
              ✅ ADMIN DASHBOARD ACTIVE
            </div>
            <h2>Admin Dashboard</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div>Pending Withdrawals</div>
                <div style={{...styles.statNumber, color: '#e53e3e'}}>{stats.pendingWithdrawals || 0}</div>
                <div>Awaiting approval</div>
              </div>
              <div style={styles.statCard}>
                <div>Pending Deposits</div>
                <div style={{...styles.statNumber, color: '#38a169'}}>{stats.pendingDeposits || 0}</div>
                <div>Awaiting approval</div>
              </div>
              <div style={styles.statCard}>
                <div>Total Users</div>
                <div style={{...styles.statNumber, color: '#3182ce'}}>{stats.totalUsers || 0}</div>
                <div>Registered users</div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={styles.title}>🛡️ ADMIN PANEL</div>
          <div style={styles.email}>mschangfx@gmail.com</div>
          <div style={styles.badge}>Authorized Admin</div>
        </div>

        <div>
          <button
            style={{
              ...styles.navButton,
              ...(activeView === 'dashboard' ? styles.activeButton : {})
            }}
            onClick={() => setActiveView('dashboard')}
          >
            📊 Admin Dashboard
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeView === 'deposits' ? styles.activeButton : {})
            }}
            onClick={() => setActiveView('deposits')}
          >
            💰 Manage Deposits
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeView === 'withdrawals' ? styles.activeButton : {})
            }}
            onClick={() => setActiveView('withdrawals')}
          >
            💸 Manage Withdrawals
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeView === 'users' ? styles.activeButton : {})
            }}
            onClick={() => setActiveView('users')}
          >
            👥 Manage Users
          </button>
        </div>

        <button
          style={styles.navButton}
          onClick={() => window.location.href = '/api/auth/signout'}
        >
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={{...styles.alert, backgroundColor: '#bee3f8', color: '#2a4365', border: '1px solid #90cdf4'}}>
          Current View: <strong>{activeView}</strong> | URL: /simple-admin | {loading ? 'Loading...' : 'Ready'}
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
