export const ELEMENT_TYPES = new Set([
  'pencil',
  'line',
  'rectangle',
  'circle',
  'text',
  'highlighter',
  'image',
  'sticky-note',
]);

export const STROKE_STYLES = new Set(['solid', 'dashed', 'dotted', 'rough']);

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
  type: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: string;
  color: string;
  strokeWidth: number;
  strokeStyle: string;
  text: string | undefined;
  filled: boolean;
  zIndex: number;
};

export function sanitizeElement(raw: unknown): SanitizedElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const el = raw as Record<string, unknown>;
  if (!isNonEmptyString(el.id, BOARD_ID_MAX)) return null;
  if (typeof el.type !== 'string' || !ELEMENT_TYPES.has(el.type)) return null;
  if (!isFiniteNumber(el.x1) || !isFiniteNumber(el.y1) || !isFiniteNumber(el.x2) || !isFiniteNumber(el.y2)) {
    return null;
  }
  if (!isValidColor(el.color)) return null;

  const points = typeof el.points === 'string' ? el.points.slice(0, POINTS_JSON_MAX) : '';
  const strokeStyle =
    typeof el.strokeStyle === 'string' && STROKE_STYLES.has(el.strokeStyle) ? el.strokeStyle : 'solid';

  return {
    id: el.id,
    type: el.type,
    x1: el.x1,
    y1: el.y1,
    x2: el.x2,
    y2: el.y2,
    points,
    color: el.color,
    strokeWidth: clampStrokeWidth(el.strokeWidth),
    strokeStyle,
    text: typeof el.text === 'string' ? el.text.slice(0, TEXT_MAX) : undefined,
    filled: Boolean(el.filled),
    zIndex: isFiniteNumber(el.zIndex) ? Math.trunc(el.zIndex) : 0,
  };
}

export function corsOriginOption(value: string | undefined): string | string[] {
  if (!value || value.trim() === '' || value.trim() === '*') return '*';
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '*';
  return parts.length === 1 ? parts[0] : parts;
}
