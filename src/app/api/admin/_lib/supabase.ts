import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  console.log('🔍 Supabase Admin Config Check:', {
    hasUrl: !!url,
    hasKey: !!key,
    urlPrefix: url ? url.substring(0, 20) + '...' : 'MISSING',
    keyPrefix: key ? key.substring(0, 10) + '...' : 'MISSING'
  });

  if (!url) {
    console.error('❌ SUPABASE_URL environment variable not set');
    throw new Error("SUPABASE_URL environment variable not set");
  }

  if (!key) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable not set');
    throw new Error("SUPABASE_SERVICE_KEY environment variable not set");
  }

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      }
    });
    console.log('✅ Supabase admin client created successfully with service role bypass');
    return client;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    throw new Error(`Failed to create Supabase client: ${error}`);
  }
}
