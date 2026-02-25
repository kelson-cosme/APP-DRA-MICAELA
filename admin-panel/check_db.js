
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sibpxfkcxwuspnczyiyu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYnB4ZmtjeHd1c3BuY3p5aXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjk2MTEsImV4cCI6MjA4NjYwNTYxMX0.6PwLu4AoT5juo2uDA7HscvVGgmPWAWHIbegefpkjO74';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkComments() {
    console.log('Checking comments table...');
    const { data, error } = await supabase
        .from('comments')
        .select('id, text, parent_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching comments:', error);
    } else {
        console.log('Last 5 comments:', JSON.stringify(data, null, 2));
    }
}

checkComments();
