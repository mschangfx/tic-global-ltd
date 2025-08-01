import { createClient } from '@supabase/supabase-js'

console.log('[admin.ts] Raw NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('[admin.ts] Raw SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ensure these environment variables are set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Added temporary debug line as requested by user
console.log('✅ ENV DEBUG:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[loaded]' : '[missing]'
});

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing from environment variables for admin client.')
}

// Create a single supabase admin client for use in server-side operations
// This client bypasses RLS.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // It's generally recommended to set autoRefreshToken to false for server-side admin clients
    // as they don't rely on user sessions in the same way.
    autoRefreshToken: false,
    persistSession: false,
    // detectSessionInUrl: false, // Only for client-side
  }
})
