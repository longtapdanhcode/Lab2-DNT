import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://khwqixeyoyoaoyochxxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FpeGV5b3lvYW95b2NoeHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzAyODcsImV4cCI6MjEwNTgwNjI4N30.9jgWCZe8A1Z3X_cxkE1LI3QG6NAuKXPxCTJGlk1t5V8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
