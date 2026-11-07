import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dttgyctwfbennrsmodkn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dGd5Y3R3ZmJlbm5yc21vZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwODk1NzksImV4cCI6MjEwOTY2NTU3OX0.ugFXNikq6K5VTjFxCL0tdJwzJj4vR74HJgDFYr5eHAU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

