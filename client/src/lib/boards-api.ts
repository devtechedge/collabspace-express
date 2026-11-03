import type { Board } from '../types';
import { getSupabase } from './supabase';

const TOKEN_PREFIX = 'collabspace_delete_token:';

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

function rememberDeleteToken(boardId: string, token: string): void {
  try {
    localStorage.setItem(`${TOKEN_PREFIX}${boardId}`, token);
  } catch {
    return;
  }
}

function readDeleteToken(boardId: string): string | null {
  try {
    return localStorage.getItem(`${TOKEN_PREFIX}${boardId}`);
  } catch {
    return null;
  }
}

async function createBoardWithId(id: string, name: string): Promise<Board> {
  const token = crypto.randomUUID();
  const { data, error } = await getSupabase().rpc('create_collabspace_board', {
    p_id: id,
    p_name: name,
    p_token: token,
  });
  const row = (Array.isArray(data) ? data[0] : data) as BoardRow | null;
  if (error || !row) throw error ?? new Error('create failed');
  rememberDeleteToken(row.id, token);
  return toBoard(row);
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
  return createBoardWithId(crypto.randomUUID(), name);
}

export async function ensureBoard(id: string, name = 'Shared board'): Promise<Board> {
  const existing = await getSupabase()
    .from('collabspace_boards')
    .select('id, name, background_color, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (existing.data) return toBoard(existing.data as BoardRow);
  try {
    return await createBoardWithId(id, name);
  } catch (error) {
    const retry = await getSupabase()
      .from('collabspace_boards')
      .select('id, name, background_color, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (retry.data) return toBoard(retry.data as BoardRow);
    throw error;
  }
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
  const token = readDeleteToken(id);
  if (!token) throw new Error('Only the board creator can delete this board.');
  const { data, error } = await getSupabase().rpc('delete_collabspace_board', {
    p_id: id,
    p_token: token,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Only the board creator can delete this board.');
  try {
    localStorage.removeItem(`${TOKEN_PREFIX}${id}`);
  } catch {
    return;
  }
}
