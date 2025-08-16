import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.headers.get("x-admin-token");
  const serverToken = process.env.ADMIN_PANEL_TOKEN;

  // Check if server token is configured
  if (!serverToken) {
    console.error("❌ ADMIN_PANEL_TOKEN environment variable not set");
    return NextResponse.json({
      success: false,
      message: "Server configuration error: ADMIN_PANEL_TOKEN not set"
    }, { status: 500 });
  }

  // Check if client provided token
  if (!token) {
    return NextResponse.json({
      success: false,
      message: "Missing x-admin-token header"
    }, { status: 401 });
  }

  // Check if tokens match
  if (token !== serverToken) {
    console.error("❌ Invalid admin token provided");
    return NextResponse.json({
      success: false,
      message: "Invalid admin token"
    }, { status: 401 });
  }

  return null;
}
