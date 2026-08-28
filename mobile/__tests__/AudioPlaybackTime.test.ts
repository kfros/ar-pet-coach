import { formatPlaybackTime } from '../audio/formatPlaybackTime';

describe('AudioPlaybackTime (CP-AUDIO-004)', () => {
  test('formats zero seconds as 0:00', () => {
    expect(formatPlaybackTime(0)).toBe('0:00');
  });

  test('formats normal and fractional second values correctly with floor', () => {
    expect(formatPlaybackTime(5)).toBe('0:05');
    expect(formatPlaybackTime(9.9)).toBe('0:09');
    expect(formatPlaybackTime(10)).toBe('0:10');
    expect(formatPlaybackTime(59.99)).toBe('0:59');
    expect(formatPlaybackTime(60)).toBe('1:00');
    expect(formatPlaybackTime(65.9)).toBe('1:05');
    expect(formatPlaybackTime(125)).toBe('2:05');
  });

  test('formats approved production track duration (1296.953469s) as 21:36', () => {
    expect(formatPlaybackTime(1296.953469)).toBe('21:36');
    expect(formatPlaybackTime(1296)).toBe('21:36');
    expect(formatPlaybackTime(1297)).toBe('21:37');
  });

  test('returns 0:00 for negative, NaN, infinity, and invalid values', () => {
    expect(formatPlaybackTime(-1)).toBe('0:00');
    expect(formatPlaybackTime(-50.5)).toBe('0:00');
    expect(formatPlaybackTime(NaN)).toBe('0:00');
    expect(formatPlaybackTime(Infinity)).toBe('0:00');
    expect(formatPlaybackTime(-Infinity)).toBe('0:00');
    expect(formatPlaybackTime(null as any)).toBe('0:00');
    expect(formatPlaybackTime(undefined as any)).toBe('0:00');
    expect(formatPlaybackTime('120' as any)).toBe('0:00');
  });
});
