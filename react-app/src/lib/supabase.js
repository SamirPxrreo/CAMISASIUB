import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ifdbpaduvpadotpmojas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GnC8zI1oNOWrRTxO8iVqEA_E-yf68uq";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
