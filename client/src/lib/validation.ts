export const ELEMENT_TYPES = [
  'pencil',
  'line',
  'rectangle',
  'circle',
  'text',
  'highlighter',
  'image',
  'sticky-note',
] as const;

export const TOOLS = [
  ...ELEMENT_TYPES,
  'select',
  'eraser',
  'laser',
] as const;

export const STROKE_STYLES = ['solid', 'dashed', 'dotted', 'rough'] as const;
export const GRID_STYLES = ['dots', 'lines', 'none'] as const;

export const BOARD_NAME_MAX = 80;
export const BOARD_ID_MAX = 80;
export const USERNAME_MAX = 32;
export const COLOR_MAX = 500;
export const TEXT_MAX = 4000;
export const POINTS_JSON_MAX = 200_000;
export const STROKE_MIN = 1;
export const STROKE_MAX = 40;

const BOARD_ID_RE = /^[a-zA-Z0-9_-]{8,80}$/;

export function isNonEmptyString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function isValidBoardName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= BOARD_NAME_MAX;
}

export function normalizeBoardName(value: string): string {
  return value.trim().slice(0, BOARD_NAME_MAX);
}

export function isValidBoardId(value: unknown): value is string {
  return typeof value === 'string' && BOARD_ID_RE.test(value);
}

export function isValidUsername(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= USERNAME_MAX;
}

export function isTool(value: unknown): boolean {
  return typeof value === 'string' && (TOOLS as readonly string[]).includes(value);
}

export function isElementType(value: unknown): boolean {
  return typeof value === 'string' && (ELEMENT_TYPES as readonly string[]).includes(value);
}

export function isStrokeStyle(value: unknown): boolean {
  return typeof value === 'string' && (STROKE_STYLES as readonly string[]).includes(value);
}

export function isGridStyle(value: unknown): boolean {
  return typeof value === 'string' && (GRID_STYLES as readonly string[]).includes(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clampStrokeWidth(value: unknown): number {
  if (!isFiniteNumber(value)) return 5;
  return Math.min(STROKE_MAX, Math.max(STROKE_MIN, Math.round(value)));
}

export function isValidColor(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= COLOR_MAX;
}

export type SanitizedElement = {
  id: string;
  type: (typeof ELEMENT_TYPES)[number];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: string;
  color: string;
  strokeWidth: number;
  strokeStyle: (typeof STROKE_STYLES)[number];
  text: string | undefined;
  filled: boolean;
  zIndex: number;
};

export function sanitizeElement(raw: unknown): SanitizedElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const el = raw as Record<string, unknown>;
  if (!isNonEmptyString(el.id, BOARD_ID_MAX)) return null;
  if (!isElementType(el.type)) return null;
  if (!isFiniteNumber(el.x1) || !isFiniteNumber(el.y1) || !isFiniteNumber(el.x2) || !isFiniteNumber(el.y2)) {
    return null;
  }
  if (!isValidColor(el.color)) return null;

  const points = typeof el.points === 'string' ? el.points.slice(0, POINTS_JSON_MAX) : '';
  const strokeStyle = isStrokeStyle(el.strokeStyle) ? el.strokeStyle : 'solid';

  return {
    id: el.id,
    type: el.type as (typeof ELEMENT_TYPES)[number],
    x1: el.x1,
    y1: el.y1,
    x2: el.x2,
    y2: el.y2,
    points,
    color: el.color,
    strokeWidth: clampStrokeWidth(el.strokeWidth),
    strokeStyle: strokeStyle as (typeof STROKE_STYLES)[number],
    text: typeof el.text === 'string' ? el.text.slice(0, TEXT_MAX) : undefined,
    filled: Boolean(el.filled),
    zIndex: isFiniteNumber(el.zIndex) ? Math.trunc(el.zIndex) : 0,
  };
}

export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((el) => el.id === item.id);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

export function getBackendUrl(envUrl: string | undefined): string {
  const raw = (envUrl || 'http://localhost:5000').trim();
  return raw.replace(/\/$/, '') || 'http://localhost:5000';
}
