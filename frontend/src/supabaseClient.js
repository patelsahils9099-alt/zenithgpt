import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eilzeupmcpnqwbbfxhsk.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbHpldXBtY3BucXdiYmZ4aHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTQ1NzMsImV4cCI6MjA5MjM3MDU3M30.6n_qvn70ijcf_gaAZ7aicoirhcukcFAeVSNv8I4AbyU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
