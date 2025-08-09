'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Admin credentials - change these to your preferred login
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'TIC2024Admin!';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  network?: string;
  destination_address?: string;
}

export default function SecureAdminControl() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
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
      // Load pending deposits
      const { data: depositsData } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Load pending withdrawals
      const { data: withdrawalsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setDeposits(depositsData || []);
      setWithdrawals(withdrawalsData || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setLoading(false);
  };

  const approveDeposit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'approved',
          admin_notes: `Approved via admin panel at ${new Date().toISOString()}`,
          approved_by: 'admin@ticgloballtd.com',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      alert('Deposit approved successfully!');
      loadTransactions();
    } catch (error) {
      console.error('Error approving deposit:', error);
      alert('Error approving deposit');
    }
  };

  const rejectDeposit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via admin panel at ${new Date().toISOString()}`,
          rejected_by: 'admin@ticgloballtd.com',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      alert('Deposit rejected successfully!');
      loadTransactions();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      alert('Error rejecting deposit');
    }
  };

  const approveWithdrawal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          admin_notes: `Approved via admin panel at ${new Date().toISOString()}`,
          processed_by: 'admin@ticgloballtd.com',
          processed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      alert('Withdrawal approved successfully!');
      loadTransactions();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Error approving withdrawal');
    }
  };

  const rejectWithdrawal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via admin panel at ${new Date().toISOString()}`,
          processed_by: 'admin@ticgloballtd.com',
          processed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      alert('Withdrawal rejected successfully!');
      loadTransactions();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      alert('Error rejecting withdrawal');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">TIC Global Admin</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">TIC Global Admin Control</h1>
          <div className="flex gap-4">
            <button
              onClick={loadTransactions}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Deposits */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Pending Deposits ({deposits.length})</h2>
            <div className="space-y-4">
              {deposits.map((deposit) => (
                <div key={deposit.id} className="border rounded-lg p-4">
                  <div className="mb-2">
                    <strong>User:</strong> {deposit.user_email}
                  </div>
                  <div className="mb-2">
                    <strong>Amount:</strong> ${deposit.amount} {deposit.currency}
                  </div>
                  <div className="mb-2">
                    <strong>Network:</strong> {deposit.network || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong>Date:</strong> {new Date(deposit.created_at).toLocaleString()}
                  </div>
                  <div className="mb-2">
                    <strong>ID:</strong> {deposit.id.substring(0, 8)}...
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveDeposit(deposit.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => rejectDeposit(deposit.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
              {deposits.length === 0 && (
                <p className="text-gray-500 text-center">No pending deposits</p>
              )}
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Pending Withdrawals ({withdrawals.length})</h2>
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="border rounded-lg p-4">
                  <div className="mb-2">
                    <strong>User:</strong> {withdrawal.user_email}
                  </div>
                  <div className="mb-2">
                    <strong>Amount:</strong> ${withdrawal.amount} {withdrawal.currency}
                  </div>
                  <div className="mb-2">
                    <strong>To:</strong> {withdrawal.destination_address?.substring(0, 20)}...
                  </div>
                  <div className="mb-2">
                    <strong>Network:</strong> {withdrawal.network || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong>Date:</strong> {new Date(withdrawal.created_at).toLocaleString()}
                  </div>
                  <div className="mb-2">
                    <strong>ID:</strong> {withdrawal.id.substring(0, 8)}...
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveWithdrawal(withdrawal.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => rejectWithdrawal(withdrawal.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && (
                <p className="text-gray-500 text-center">No pending withdrawals</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
