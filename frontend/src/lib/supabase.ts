import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://gfirgasptccfbbgfaigs.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaXJnYXNwdGNjZmJiZ2ZhaWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDEyMDAsImV4cCI6MjEwNzcxNzIwMH0.pWyFhaup7odeEp7t4nZor1ub683Kk1fBzcnpTI2pbi4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

