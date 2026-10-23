import { describe, expect, it } from 'vitest';
import { parseBoolean } from '../../src/config/env';

describe('env helpers', () => {
  it('parses boolean flags with a fallback', () => {
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean('', false)).toBe(false);
    expect(parseBoolean('TRUE', false)).toBe(true);
    expect(parseBoolean('yes', false)).toBe(true);
    expect(parseBoolean('0', true)).toBe(false);
    expect(parseBoolean('off', true)).toBe(false);
  });
});
