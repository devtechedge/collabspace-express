import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampStrokeWidth,
  corsOriginOption,
  isValidBoardId,
  isValidBoardName,
  sanitizeElement,
} from './validation';

describe('isValidBoardName', () => {
  it('rejects empty and oversized names', () => {
    assert.equal(isValidBoardName('Sprint'), true);
    assert.equal(isValidBoardName(''), false);
    assert.equal(isValidBoardName('x'.repeat(81)), false);
  });
});

describe('isValidBoardId', () => {
  it('accepts UUID-like ids', () => {
    assert.equal(isValidBoardId('2f1c8a90-3b4d-4e5f-a678-90abcdef1234'), true);
    assert.equal(isValidBoardId('../etc'), false);
  });
});

describe('clampStrokeWidth', () => {
  it('clamps to 1–40', () => {
    assert.equal(clampStrokeWidth(2), 2);
    assert.equal(clampStrokeWidth(0), 1);
    assert.equal(clampStrokeWidth(100), 40);
    assert.equal(clampStrokeWidth(undefined), 5);
  });
});

describe('sanitizeElement', () => {
  it('drops unknown types and non-finite coordinates', () => {
    const ok = sanitizeElement({
      id: 'el_abcdef12',
      type: 'line',
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
      color: '#fff',
      strokeWidth: 2,
    });
    assert.ok(ok);
    assert.equal(ok.type, 'line');
    assert.equal(sanitizeElement({ id: 'el_abcdef12', type: 'worm', x1: 0, y1: 0, x2: 1, y2: 1, color: '#fff' }), null);
    assert.equal(sanitizeElement({ id: 'el_abcdef12', type: 'line', x1: Infinity, y1: 0, x2: 1, y2: 1, color: '#fff' }), null);
  });
});

describe('corsOriginOption', () => {
  it('defaults to * and splits a comma list', () => {
    assert.equal(corsOriginOption(undefined), '*');
    assert.equal(corsOriginOption('*'), '*');
    assert.equal(corsOriginOption('https://collabspace-express.vercel.app'), 'https://collabspace-express.vercel.app');
    assert.deepEqual(corsOriginOption('https://a.example, https://b.example'), [
      'https://a.example',
      'https://b.example',
    ]);
  });
});
