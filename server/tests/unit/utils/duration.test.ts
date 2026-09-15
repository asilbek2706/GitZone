import { describe, expect, it } from 'vitest';

import { parseDurationToMilliseconds } from '../../../src/utils/duration.js';

describe('parseDurationToMilliseconds', () => {
  it('parses milliseconds', () => {
    expect(parseDurationToMilliseconds('500ms')).toBe(500);
  });

  it('parses seconds', () => {
    expect(parseDurationToMilliseconds('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDurationToMilliseconds('15m')).toBe(15 * 60 * 1000);
  });

  it('parses hours', () => {
    expect(parseDurationToMilliseconds('12h')).toBe(12 * 60 * 60 * 1000);
  });

  it('parses days', () => {
    expect(parseDurationToMilliseconds('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('trims surrounding whitespace', () => {
    expect(parseDurationToMilliseconds('  7d  ')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('accepts uppercase units', () => {
    expect(parseDurationToMilliseconds('2H')).toBe(2 * 60 * 60 * 1000);
  });

  it.each(['', '7', 'days', '7days', '-1d', '1.5h', 'abc'])(
    'rejects invalid duration "%s"',
    (duration) => {
      expect(() => parseDurationToMilliseconds(duration)).toThrow(
        `Invalid duration format: ${duration}`,
      );
    },
  );

  it('rejects zero duration', () => {
    expect(() => parseDurationToMilliseconds('0s')).toThrow('Invalid duration value: 0s');
  });

  it('rejects durations that exceed the safe integer range', () => {
    expect(() => parseDurationToMilliseconds('999999999999999999d')).toThrow(
      'Invalid duration value: 999999999999999999d',
    );
  });
});
