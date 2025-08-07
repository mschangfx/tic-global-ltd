'use client';

import { useState } from 'react';

export default function ApiTest() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const ADMIN_KEY = 'admin_key_2024_tic_global';

  const testApi = async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = {
    padding: '12px 24px',
    margin: '8px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3182ce',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const containerStyle = {
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const responseStyle = {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '14px',
    minHeight: '200px'
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#e53e3e', marginBottom: '24px' }}>🔧 TIC Global Admin API Tester</h1>
      
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#c6f6d5', borderRadius: '8px' }}>
        <strong>✅ API Testing Page Active</strong>
        <br />
        Admin Key: <code>{ADMIN_KEY}</code>
        <br />
        Status: {loading ? 'Loading...' : 'Ready'}
      </div>

      <h2>📊 Statistics & Data</h2>
      <div style={{ marginBottom: '24px' }}>
        <button
          style={buttonStyle}
          onClick={() => testApi(`/api/admin-actions?key=${ADMIN_KEY}&action=stats`)}
        >
          Get Statistics
        </button>
        <button
          style={buttonStyle}
          onClick={() => testApi(`/api/admin-actions?key=${ADMIN_KEY}&action=pending-deposits`)}
        >
          Get Pending Deposits
        </button>
        <button
          style={buttonStyle}
          onClick={() => testApi(`/api/admin-actions?key=${ADMIN_KEY}&action=pending-withdrawals`)}
        >
          Get Pending Withdrawals
        </button>
      </div>

      <h2>✅ Transaction Actions</h2>
      <div style={{ marginBottom: '24px' }}>
        <button
          style={{...buttonStyle, backgroundColor: '#38a169'}}
          onClick={() => testApi('/api/admin-actions', 'POST', {
            key: ADMIN_KEY,
            action: 'update-transaction',
            transactionId: 'SAMPLE_DEPOSIT_ID',
            transactionType: 'deposit',
            status: 'approved',
            adminNotes: 'Test approval via API tester'
          })}
        >
          Test Approve Deposit
        </button>
        <button
          style={{...buttonStyle, backgroundColor: '#e53e3e'}}
          onClick={() => testApi('/api/admin-actions', 'POST', {
            key: ADMIN_KEY,
            action: 'update-transaction',
            transactionId: 'SAMPLE_DEPOSIT_ID',
            transactionType: 'deposit',
            status: 'rejected',
            adminNotes: 'Test rejection via API tester'
          })}
        >
          Test Reject Deposit
        </button>
        <button
          style={{...buttonStyle, backgroundColor: '#38a169'}}
          onClick={() => testApi('/api/admin-actions', 'POST', {
            key: ADMIN_KEY,
            action: 'update-transaction',
            transactionId: 'SAMPLE_WITHDRAWAL_ID',
            transactionType: 'withdrawal',
            status: 'approved',
            adminNotes: 'Test approval via API tester'
          })}
        >
          Test Approve Withdrawal
        </button>
        <button
          style={{...buttonStyle, backgroundColor: '#e53e3e'}}
          onClick={() => testApi('/api/admin-actions', 'POST', {
            key: ADMIN_KEY,
            action: 'update-transaction',
            transactionId: 'SAMPLE_WITHDRAWAL_ID',
            transactionType: 'withdrawal',
            status: 'rejected',
            adminNotes: 'Test rejection via API tester'
          })}
        >
          Test Reject Withdrawal
        </button>
      </div>

      <h2>🔍 API Response</h2>
      <div style={responseStyle}>
        {response || 'Click any button above to test the API...'}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fefcbf', borderRadius: '8px' }}>
        <h3>📝 Instructions:</h3>
        <ol>
          <li><strong>Get Statistics</strong> - Shows pending counts and user totals</li>
          <li><strong>Get Pending Deposits/Withdrawals</strong> - Lists all pending transactions</li>
          <li><strong>Test Actions</strong> - Try approve/reject with sample IDs (will show errors for non-existent IDs)</li>
          <li><strong>Real Usage</strong> - Replace SAMPLE_*_ID with actual transaction IDs from the pending lists</li>
        </ol>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#bee3f8', borderRadius: '8px' }}>
        <h3>🌐 Direct API URLs:</h3>
        <p><strong>Statistics:</strong><br />
        <code>GET /api/admin-actions?key={ADMIN_KEY}&action=stats</code></p>
        
        <p><strong>Pending Deposits:</strong><br />
        <code>GET /api/admin-actions?key={ADMIN_KEY}&action=pending-deposits</code></p>
        
        <p><strong>Pending Withdrawals:</strong><br />
        <code>GET /api/admin-actions?key={ADMIN_KEY}&action=pending-withdrawals</code></p>
        
        <p><strong>Update Transaction:</strong><br />
        <code>POST /api/admin-actions</code><br />
        Body: <code>{`{"key":"${ADMIN_KEY}","action":"update-transaction","transactionId":"ID","transactionType":"deposit|withdrawal","status":"approved|rejected","adminNotes":"Your note"}`}</code></p>
      </div>
    </div>
  );
}
