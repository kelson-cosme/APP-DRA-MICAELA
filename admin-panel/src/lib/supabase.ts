
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'https://sibpxfkcxwuspnczyiyu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYnB4ZmtjeHd1c3BuY3p5aXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjk2MTEsImV4cCI6MjA4NjYwNTYxMX0.6PwLu4AoT5juo2uDA7HscvVGgmPWAWHIbegefpkjO74';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
