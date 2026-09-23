import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dktjtnjkrmrxvksjizwn.supabase.co';
const DEFAULT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let cachedClient: SupabaseClient | null = null;
let currentKey = '';

export function getSupabaseAnonKey(): string {
  // If environment variable is configured, use it as primary
  if (DEFAULT_ANON_KEY && DEFAULT_ANON_KEY.length > 20) {
    return DEFAULT_ANON_KEY;
  }
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('rolewise_supabase_anon_key');
    if (stored) return stored;
  }
  return DEFAULT_ANON_KEY;
}

export function setSupabaseAnonKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem('rolewise_supabase_anon_key', key);
    } else {
      localStorage.removeItem('rolewise_supabase_anon_key');
    }
  }
  currentKey = key;
  cachedClient = null; // force recreation with new key
}

export function getSupabaseClient(): SupabaseClient {
  const activeKey = getSupabaseAnonKey() || 'placeholder-anon-key-awaiting-configuration';
  
  if (cachedClient && currentKey === activeKey) {
    return cachedClient;
  }

  cachedClient = createClient(SUPABASE_URL, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  
  currentKey = activeKey;
  return cachedClient;
}

export const supabase = getSupabaseClient();
