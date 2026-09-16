import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CanvasElement } from '../types';
import { sanitizeElement } from './validation';
import { ensureBoard, updateBoardBackground } from './boards-api';
import { getSupabase, peerId } from './supabase';

type Handler = (payload: unknown) => void;

export interface CollabConnection {
  emit: (event: string, payload?: Record<string, unknown>) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  disconnect: () => void;
}

type ElementRow = {
  id: string;
  board_id: string;
  type: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: string;
  color: string;
  stroke_width: number;
  stroke_style: string;
  text: string | null;
  filled: boolean;
  z_index: number;
  src: string | null;
  width: number | null;
  height: number | null;
};

function rowToElement(row: ElementRow): CanvasElement {
  return {
    id: row.id,
    type: row.type as CanvasElement['type'],
    x1: row.x1,
    y1: row.y1,
    x2: row.x2,
    y2: row.y2,
    points: row.points || undefined,
    color: row.color,
    strokeWidth: row.stroke_width,
    strokeStyle: (row.stroke_style as CanvasElement['strokeStyle']) || 'solid',
    text: row.text ?? undefined,
    filled: row.filled,
    zIndex: row.z_index,
    src: row.src ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

function elementToRow(boardId: string, el: CanvasElement) {
  return {
    id: el.id,
    board_id: boardId,
    type: el.type,
    x1: el.x1,
    y1: el.y1,
    x2: el.x2,
    y2: el.y2,
    points: el.points || '',
    color: el.color,
    stroke_width: el.strokeWidth,
    stroke_style: el.strokeStyle || 'solid',
    text: el.text ?? null,
    filled: el.filled ?? false,
    z_index: el.zIndex ?? 0,
    src: el.src ?? null,
    width: el.width ?? null,
    height: el.height ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function connectCollab(): CollabConnection {
  const selfId = peerId();
  const handlers = new Map<string, Set<Handler>>();
  let channel: RealtimeChannel | null = null;
  let boardId: string | null = null;
  let userName = 'Guest';
  let color = '#1f5c5a';

  const emitLocal = (event: string, payload: unknown) => {
    handlers.get(event)?.forEach((fn) => fn(payload));
  };

  const broadcast = (event: string, payload: Record<string, unknown>) => {
    channel?.send({ type: 'broadcast', event, payload: { ...payload, socketId: selfId } });
  };

  const persistElement = async (el: CanvasElement) => {
    if (!boardId) return;
    const clean = sanitizeElement(el);
    if (!clean) return;
    await getSupabase().from('collabspace_elements').upsert(elementToRow(boardId, { ...el, ...clean }));
  };

  const join = async (id: string, name: string) => {
    boardId = id;
    userName = name;
    await ensureBoard(id);
    const supabase = getSupabase();
    const { data: board } = await supabase
      .from('collabspace_boards')
      .select('background_color')
      .eq('id', id)
      .maybeSingle();
    const { data: rows } = await supabase
      .from('collabspace_elements')
      .select('*')
      .eq('board_id', id)
      .order('z_index', { ascending: true });
    emitLocal('canvas-history', {
      elements: (rows as ElementRow[] | null)?.map(rowToElement) ?? [],
      backgroundColor: board?.background_color,
    });

    channel = supabase.channel(`collabspace:${id}`, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    });

    channel
      .on('broadcast', { event: 'element-update' }, ({ payload }) => {
        if (payload && typeof payload === 'object' && 'element' in payload) {
          emitLocal('element-update', (payload as { element: CanvasElement }).element);
        }
      })
      .on('broadcast', { event: 'element-delete' }, ({ payload }) => {
        const elementId = (payload as { elementId?: string })?.elementId;
        if (elementId) emitLocal('element-delete', elementId);
      })
      .on('broadcast', { event: 'canvas-cleared' }, () => emitLocal('canvas-cleared', null))
      .on('broadcast', { event: 'board-bg-updated' }, ({ payload }) => emitLocal('board-bg-updated', payload))
      .on('broadcast', { event: 'cursor-update' }, ({ payload }) => emitLocal('cursor-update', payload))
      .on('broadcast', { event: 'laser-update' }, ({ payload }) => emitLocal('laser-update', payload))
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p) => {
          const idLeft = (p as { socketId?: string }).socketId || (p as { presence_ref?: string }).presence_ref;
          if (idLeft) emitLocal('user-left', idLeft);
        });
      });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel?.track({ socketId: selfId, userName, color });
      }
    });
  };

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler);
    },
    emit(event, payload = {}) {
      switch (event) {
        case 'join-room': {
          const id = String(payload.boardId ?? '');
          const name = String(payload.userName ?? 'Guest');
          void join(id, name);
          break;
        }
        case 'draw-element': {
          const element = payload.element as CanvasElement;
          if (!element) return;
          broadcast('element-update', { element });
          void persistElement(element);
          break;
        }
        case 'delete-element': {
          const elementId = String(payload.elementId ?? '');
          if (!elementId || !boardId) return;
          broadcast('element-delete', { elementId });
          void getSupabase().from('collabspace_elements').delete().eq('id', elementId).eq('board_id', boardId);
          break;
        }
        case 'clear-board': {
          if (!boardId) return;
          broadcast('canvas-cleared', {});
          void getSupabase().from('collabspace_elements').delete().eq('board_id', boardId);
          break;
        }
        case 'update-board-bg': {
          const backgroundColor = String(payload.backgroundColor ?? '');
          if (!boardId || !backgroundColor) return;
          broadcast('board-bg-updated', { backgroundColor });
          void updateBoardBackground(boardId, backgroundColor);
          break;
        }
        case 'cursor-move': {
          userName = String(payload.userName ?? userName);
          color = String(payload.color ?? color);
          broadcast('cursor-update', {
            socketId: selfId,
            userName,
            color,
            x: Number(payload.x),
            y: Number(payload.y),
          });
          void channel?.track({ socketId: selfId, userName, color });
          break;
        }
        case 'laser-move': {
          broadcast('laser-update', {
            socketId: selfId,
            userName: String(payload.userName ?? userName),
            color: String(payload.color ?? color),
            points: payload.points,
          });
          break;
        }
        default:
          break;
      }
    },
    disconnect() {
      if (channel) {
        void getSupabase().removeChannel(channel);
        channel = null;
      }
      handlers.clear();
    },
  };
}
