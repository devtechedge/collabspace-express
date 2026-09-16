import type { Board } from '../types';
import { getSupabase } from './supabase';

type BoardRow = {
  id: string;
  name: string;
  background_color: string | null;
  created_at: string;
  updated_at: string;
};

function toBoard(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    backgroundColor: row.background_color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBoards(): Promise<Board[]> {
  const { data, error } = await getSupabase()
    .from('collabspace_boards')
    .select('id, name, background_color, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as BoardRow[] | null)?.map(toBoard) ?? [];
}

export async function createBoard(name: string): Promise<Board> {
  const { data, error } = await getSupabase()
    .from('collabspace_boards')
    .insert({ name })
    .select('id, name, background_color, created_at, updated_at')
    .single();
  if (error || !data) throw error ?? new Error('create failed');
  return toBoard(data as BoardRow);
}

export async function ensureBoard(id: string, name = 'Shared board'): Promise<Board> {
  const existing = await getSupabase()
    .from('collabspace_boards')
    .select('id, name, background_color, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (existing.data) return toBoard(existing.data as BoardRow);
  const { data, error } = await getSupabase()
    .from('collabspace_boards')
    .insert({ id, name })
    .select('id, name, background_color, created_at, updated_at')
    .single();
  if (error || !data) throw error ?? new Error('ensure failed');
  return toBoard(data as BoardRow);
}

export async function renameBoard(id: string, name: string): Promise<void> {
  const { error } = await getSupabase()
    .from('collabspace_boards')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateBoardBackground(id: string, backgroundColor: string): Promise<void> {
  const { error } = await getSupabase()
    .from('collabspace_boards')
    .update({ background_color: backgroundColor, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBoard(id: string): Promise<void> {
  const { error } = await getSupabase().from('collabspace_boards').delete().eq('id', id);
  if (error) throw error;
}
