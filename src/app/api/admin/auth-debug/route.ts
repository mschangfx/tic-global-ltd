export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
const dig = (s: string) => crypto.createHash("sha256").update(s ?? "").digest("hex").slice(0,8);

export async function GET(req: NextRequest) {
  const headerToken = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const auth = req.headers.get("authorization");
  const bearer = auth && auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

  const provided = (headerToken ?? bearer ?? "").trim();
  const expected = (process.env.ADMIN_PANEL_TOKEN ?? "").trim();

  return NextResponse.json({
    ok: true,
    provided: { has: !!provided, len: provided.length, hash8: provided ? dig(provided) : null },
    expected: { has: !!expected, len: expected.length, hash8: expected ? dig(expected) : null },
    match: !!provided && !!expected && provided === expected
  });
}
