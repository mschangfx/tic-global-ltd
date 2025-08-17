export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  // Mock data for testing
  const mockTransactions = [
    {
      id: "1",
      type: "deposit",
      amount: "100.00",
      user_email: "user1@example.com",
      status: "pending",
      created_at: new Date().toISOString(),
      payment_method: "Bank Transfer"
    },
    {
      id: "2", 
      type: "withdrawal",
      amount: "50.00",
      user_email: "user2@example.com",
      status: "pending",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      wallet_address: "0x1234...5678"
    },
    {
      id: "3",
      type: "deposit", 
      amount: "250.00",
      user_email: "user3@example.com",
      status: "pending",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      payment_method: "Credit Card"
    }
  ];

  return NextResponse.json({ 
    success: true, 
    transactions: mockTransactions 
  });
}
