import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function digest(v: unknown) {
  return crypto.createHash("sha256").update(String(v ?? "")).digest("hex");
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  // Accept either header style
  const headerToken = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const auth = req.headers.get("authorization");
  const bearerToken = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const provided = (headerToken ?? bearerToken ?? "").trim();

  const expected = (process.env.ADMIN_PANEL_TOKEN ?? "").trim();

  if (!provided || !expected || provided !== expected) {
    // Safe debug: log only digests & length, not raw secrets
    console.error("[ADMIN AUTH FAIL]", {
      haveProvided: Boolean(provided),
      haveExpected: Boolean(expected),
      providedLen: provided.length,
      expectedLen: expected.length,
      providedHash8: digest(provided).slice(0, 8),
      expectedHash8: digest(expected).slice(0, 8),
      hint: "Token mismatch or missing; check Vercel env & client-stored token"
    });
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return null;
}
