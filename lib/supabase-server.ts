import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using Service Role Key
 * to bypass RLS for internal dashboard usage.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^"|"$/g, '');
const supabaseServiceKey = process.env.CORE_SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^"|"$/g, '');

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase Admin client missing credentials.");
}

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
