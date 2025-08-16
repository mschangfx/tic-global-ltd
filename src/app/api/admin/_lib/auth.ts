import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_PANEL_TOKEN) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return null;
}
