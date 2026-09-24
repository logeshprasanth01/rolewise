import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dktjtnjkrmrxvksjizwn.supabase.co';
const DEFAULT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAnonKey(): string {
  return DEFAULT_ANON_KEY;
}

export function getSupabaseClient(): SupabaseClient {
  const activeKey = getSupabaseAnonKey() || 'placeholder-anon-key-awaiting-configuration';

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(SUPABASE_URL, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

export const supabase = getSupabaseClient();
