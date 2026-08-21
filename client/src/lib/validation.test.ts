import { describe, expect, it } from 'vitest';
import {
  clampStrokeWidth,
  getBackendUrl,
  isElementType,
  isTool,
  isValidBoardId,
  isValidBoardName,
  isValidUsername,
  normalizeBoardName,
  sanitizeElement,
  upsertById,
} from './validation';

describe('board name', () => {
  it('accepts a trimmed name up to 80 chars', () => {
    expect(isValidBoardName('Design Sprint')).toBe(true);
    expect(isValidBoardName('  ok  ')).toBe(true);
    expect(isValidBoardName('')).toBe(false);
    expect(isValidBoardName('   ')).toBe(false);
    expect(isValidBoardName('x'.repeat(81))).toBe(false);
    expect(isValidBoardName(null)).toBe(false);
    expect(normalizeBoardName('  Board  ')).toBe('Board');
  });
});

describe('board id', () => {
  it('allows UUID-shaped room ids and rejects junk', () => {
    expect(isValidBoardId('2f1c8a90-3b4d-4e5f-a678-90abcdef1234')).toBe(true);
    expect(isValidBoardId('local_demo_01')).toBe(true);
    expect(isValidBoardId('short')).toBe(false);
    expect(isValidBoardId('../etc/passwd')).toBe(false);
    expect(isValidBoardId('has space hereok')).toBe(false);
  });
});

describe('username', () => {
  it('caps display names at 32 characters', () => {
    expect(isValidUsername('Ada')).toBe(true);
    expect(isValidUsername('x'.repeat(33))).toBe(false);
    expect(isValidUsername('')).toBe(false);
  });
});

describe('tools and elements', () => {
  it('allow-lists drawing tools and persistable element types', () => {
    expect(isTool('pencil')).toBe(true);
    expect(isTool('laser')).toBe(true);
    expect(isTool('select')).toBe(true);
    expect(isTool('nuke')).toBe(false);
    expect(isElementType('sticky-note')).toBe(true);
    expect(isElementType('select')).toBe(false);
    expect(isElementType('laser')).toBe(false);
  });
});

describe('stroke width', () => {
  it('clamps to 1–40 and defaults garbage to 5', () => {
    expect(clampStrokeWidth(5)).toBe(5);
    expect(clampStrokeWidth(0)).toBe(1);
    expect(clampStrokeWidth(99)).toBe(40);
    expect(clampStrokeWidth('thick')).toBe(5);
    expect(clampStrokeWidth(Number.NaN)).toBe(5);
  });
});

describe('sanitizeElement', () => {
  const base = {
    id: 'el_12345678',
    type: 'rectangle',
    x1: 0,
    y1: 0,
    x2: 10,
    y2: 10,
    color: '#6366f1',
    strokeWidth: 5,
  };

  it('returns a persistable element and drops unknown types', () => {
    const ok = sanitizeElement({ ...base, filled: true, zIndex: 3.9 });
    expect(ok).toMatchObject({ type: 'rectangle', filled: true, zIndex: 3, strokeStyle: 'solid' });
    expect(sanitizeElement({ ...base, type: 'malware' })).toBeNull();
    expect(sanitizeElement({ ...base, x1: 'nope' })).toBeNull();
    expect(sanitizeElement(null)).toBeNull();
  });

  it('caps points JSON and text length', () => {
    const huge = 'a'.repeat(200_001);
    const out = sanitizeElement({ ...base, type: 'pencil', points: huge, text: 'n'.repeat(5000) });
    expect(out?.points.length).toBe(200_000);
    expect(out?.text?.length).toBe(4000);
  });
});

describe('upsertById', () => {
  it('inserts or replaces by id without duplicating', () => {
    const a = { id: 'a', n: 1 };
    const b = { id: 'b', n: 2 };
    expect(upsertById([a], b)).toEqual([a, b]);
    expect(upsertById([a, b], { id: 'a', n: 9 })).toEqual([{ id: 'a', n: 9 }, b]);
  });
});

describe('getBackendUrl', () => {
  it('strips a trailing slash and falls back to localhost:5000', () => {
    expect(getBackendUrl('https://api.example.com/')).toBe('https://api.example.com');
    expect(getBackendUrl(undefined)).toBe('http://localhost:5000');
    expect(getBackendUrl('')).toBe('http://localhost:5000');
  });
});
