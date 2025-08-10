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
  depositId: z.string().uuid().optional(),
});

const BUCKET = 'user-uploads';

function fail(status: number, step: string, message: string, extra?: any) {
  const payload = { success: false, step, message, extra };
  console.error('[DEPOSITS]', JSON.stringify(payload));
  return NextResponse.json(payload, { status });
}

function ok(data: any) {
  return NextResponse.json({ success: true, ...data });
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const s = supabase();

  try {
    // 1) Validate env
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail(500, 'env', 'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    // 2) Parse body (JSON or multipart)
    const ct = req.headers.get('content-type') ?? '';
    let file: File | null = null;
    let body: z.infer<typeof BodySchema>;

    if (ct.startsWith('multipart/form-data')) {
      const fd = await req.formData();
      file = (fd.get('receipt') as File) ?? null;

      const payload: Record<string, string> = {};
      for (const key of ['userEmail','amount','currency','paymentMethod','accountNumber','accountName','note','depositId']) {
        const v = fd.get(key);
        if (typeof v === 'string') payload[key] = v;
      }
      try {
        body = BodySchema.parse(payload);
      } catch (zerr: any) {
        return fail(400, 'validate', 'Validation error (multipart)', zerr.issues ?? zerr.message);
      }
    } else {
      const json = await req.json().catch(() => null);
      if (!json) return fail(400, 'parse', 'Expected JSON or multipart/form-data.');
      try {
        body = BodySchema.parse(json);
      } catch (zerr: any) {
        return fail(400, 'validate', 'Validation error (json)', zerr.issues ?? zerr.message);
      }
    }

    // 3) Optional storage upload
    let receiptUrl: string | null = null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return fail(400, 'upload', 'Receipt file must be ≤ 5MB.');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `manual-deposits/${Date.now()}_${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await s.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (uploadError) {
        return fail(500, 'upload', 'Failed to upload receipt file', { code: uploadError.name, message: uploadError.message });
      }

      const { data } = s.storage.from(BUCKET).getPublicUrl(path);
      receiptUrl = data.publicUrl;
    }

    // 4) DB write
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

    const result = body.depositId
      ? await s.from('deposits').update(row).eq('id', body.depositId).select().single()
      : await s.from('deposits').insert(row).select().single();

    if (result.error) {
      return fail(500, 'db', 'Database write failed', {
        code: (result.error as any).code,
        message: result.error.message,
        details: (result.error as any).details,
        hint: (result.error as any).hint,
      });
    }

    return ok({ message: 'Deposit submitted', deposit: result.data });
  } catch (err: any) {
    return fail(500, 'unhandled', 'Internal server error', err?.message ?? String(err));
  }
}

export async function GET() {
  const s = supabase();
  const envOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  // check storage bucket
  let storageOk = false, storageErr: any = null;
  try {
    const { data, error } = await s.storage.from(BUCKET).list('', { limit: 1 });
    storageOk = !error;
    if (error) storageErr = { message: error.message, name: error.name };
  } catch (e: any) {
    storageErr = { message: e?.message ?? String(e) };
  }

  // check DB
  let dbOk = false, dbErr: any = null, columns: string[] = [];
  try {
    // fetch small sample & infer columns
    const { data, error } = await s.from('deposits').select('*').limit(1);
    if (error) {
      dbErr = { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code };
    } else {
      dbOk = true;
      if (data && data.length > 0) columns = Object.keys(data[0] as any);
      else {
        // table empty – try a projection to force metadata
        const probe = await s.from('deposits').select('id,user_email,amount,currency,payment_method,status,transaction_hash,receipt_url,account_number,account_name,request_metadata,created_at,updated_at').limit(0);
        if (probe.error) {
          dbErr = { message: probe.error.message, details: (probe.error as any).details, hint: (probe.error as any).hint, code: (probe.error as any).code };
        } else {
          columns = ['id','user_email','amount','currency','payment_method','status','transaction_hash','receipt_url','account_number','account_name','request_metadata','created_at','updated_at'];
        }
      }
    }
  } catch (e: any) {
    dbErr = { message: e?.message ?? String(e) };
  }

  return ok({ envOk, storageOk, storageErr, dbOk, dbErr, expectedColumns: ['user_email','amount','currency','payment_method','status','transaction_hash','receipt_url','account_number','account_name','request_metadata'], columns });
}
