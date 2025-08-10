// app/api/deposits/manual/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  userEmail: z.string().email(),
  amount: z.coerce.number().positive(),
  currency: z.string().default('PHP'),
  paymentMethod: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  note: z.string().optional(),
  depositId: z.string().uuid().optional(), // if provided, update that row
});

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status: 400 });
}
function serverError(message: string, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status: 500 });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') ?? '';
    let file: File | null = null;
    let body: z.infer<typeof BodySchema>;

    if (ct.startsWith('multipart/form-data')) {
      const fd = await req.formData();
      file = (fd.get('receipt') as File) ?? null;

      const payload: Record<string, string> = {};
      for (const key of [
        'userEmail','amount','currency','paymentMethod','accountNumber','accountName','note','depositId'
      ]) {
        const v = fd.get(key);
        if (typeof v === 'string') payload[key] = v;
      }
      body = BodySchema.parse(payload);
    } else {
      const json = await req.json().catch(() => null);
      if (!json) return badRequest('Expected JSON or multipart/form-data.');
      body = BodySchema.parse(json);
    }

    // Optional receipt upload
    let receiptUrl: string | null = null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return badRequest('Receipt file must be ≤ 5MB.');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `manual-deposits/${Date.now()}_${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase
        .storage.from('user-uploads')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });
      if (uploadError) return serverError('Failed to upload receipt file', uploadError.message);

      const { data } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
      receiptUrl = data.publicUrl;
    }

    const transactionHash = `manual_${uuidv4()}`;
    const row = {
      user_email: body.userEmail,
      amount: body.amount,
      currency: body.currency,
      payment_method: body.paymentMethod,
      status: 'pending',
      transaction_hash: transactionHash,
      receipt_url: receiptUrl,
      account_number: body.accountNumber,
      account_name: body.accountName,
      request_metadata: {
        note: body.note ?? null,
        source: 'manual',
        ip: req.headers.get('x-forwarded-for') ?? null,
        ua: req.headers.get('user-agent') ?? null,
      },
    };

    // Insert or update
    let db;
    if (body.depositId) {
      db = await supabase.from('deposits').update(row).eq('id', body.depositId).select().single();
    } else {
      db = await supabase.from('deposits').insert(row).select().single();
    }
    if (db.error) return serverError('Database write failed', db.error.message);

    return NextResponse.json({ success: true, message: 'Deposit submitted', deposit: db.data });
  } catch (err: any) {
    console.error('POST /api/deposits/manual failed:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Validation error', issues: err.issues }, { status: 400 });
    }
    return serverError('Internal server error', err?.message ?? String(err));
  }
}

export async function GET() {
  const envOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { error } = await supabase.from('deposits').select('id').limit(1);
    return NextResponse.json({ ok: envOk && !error, envOk, dbOk: !error, dbError: error?.message ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, envOk, dbOk: false, dbError: e?.message ?? String(e) }, { status: 500 });
  }
}
