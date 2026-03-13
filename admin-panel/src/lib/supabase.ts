
import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Admin: Supabase URL or Anon Key is missing! Check your admin-panel/.env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client using Service Role Key (Only use in secure admin environments)
// IMPORTANT: Add your VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
