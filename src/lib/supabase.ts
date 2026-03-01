import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://alyfmlwuodixxyyboyph.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWZtbHd1b2RpeHh5eWJveXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTE1NDEsImV4cCI6MjA4NzkyNzU0MX0.cDUpmkt-iFDb86n9jv7gg67ZxjFdVgQuATUhU0dDClg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
