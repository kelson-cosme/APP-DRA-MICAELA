
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'https://jnorizuimmorlumefctn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub3JpenVpbW1vcmx1bWVmY3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Njg3MzgsImV4cCI6MjA4ODA0NDczOH0.9cIoN6Ws3LU5DT9zTv4OVsShYDPGGH52vo4ZPSIBTik';

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
