import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requiredEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} must be set.`);
  return trimmed;
}

const URL = requiredEnv(
  'VITE_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
);
const KEY = requiredEnv(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: false } });
  return client;
}

export function peerId(): string {
  try {
    let id = sessionStorage.getItem('collabspace_peer_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('collabspace_peer_id', id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
