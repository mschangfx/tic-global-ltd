import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest) {
  const headerToken = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const provided = (headerToken ?? "").trim();

  // Accept either environment variable or simple hardcoded token
  const envToken = (process.env.ADMIN_PANEL_TOKEN ?? "").trim();
  const simpleToken = "simple-admin-token";

  if (!provided || (provided !== envToken && provided !== simpleToken)) {
    return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 });
  }
  return null;
}
