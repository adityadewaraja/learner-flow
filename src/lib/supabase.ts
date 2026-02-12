import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvcvhdknekuddekcstyv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3ZoZGtuZWt1ZGRla2NzdHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzcwNjAsImV4cCI6MjA4NjQ1MzA2MH0.wObPq9o7EkDex6LjlIPUQza3drKFqFzNUHc-dDK9Ob8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
