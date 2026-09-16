import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://dphiogjvekiwnixzdhuo.supabase.co';
const KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaGlvZ2p2ZWtpd25peHpkaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTY1OTgsImV4cCI6MjA5NzI5MjU5OH0.3os7eRw0E97mTzwrTa_8Z4LypmPPZMgXL7XXIvjV-lQ';

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
