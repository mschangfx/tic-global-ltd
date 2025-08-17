import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest) {
  const headerToken = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const auth = req.headers.get("authorization");
  const bearer = auth && auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const provided = (headerToken ?? bearer ?? "").trim();
  const expected = (process.env.ADMIN_PANEL_TOKEN ?? "").trim();

  if (!provided || !expected || provided !== expected) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return null;
}
