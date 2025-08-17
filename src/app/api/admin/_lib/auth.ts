import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function digest(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

export function requireAdmin(req: NextRequest) {
  const headerToken = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const auth = req.headers.get("authorization");
  const bearer = auth && auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

  const provided = (headerToken ?? bearer ?? "").trim();
  const expected = (process.env.ADMIN_PANEL_TOKEN ?? "").trim();

  if (!provided || !expected || provided !== expected) {
    console.error("[ADMIN AUTH FAIL]", {
      haveProvided: Boolean(provided),
      haveExpected: Boolean(expected),
      providedLen: provided.length,
      expectedLen: expected.length,
      providedHash8: provided ? digest(provided) : null,
      expectedHash8: expected ? digest(expected) : null,
      hint: "Mismatch or missing token. Check Vercel env + client localStorage."
    });
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return null;
}
