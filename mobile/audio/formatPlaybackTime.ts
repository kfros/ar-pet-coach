/**
 * Pure helper to format playback time in seconds into m:ss format.
 *
 * Requirements:
 * - Floored seconds with zero-padded 2-digit seconds (e.g. 0 -> '0:00', 65.9 -> '1:05', 1296.95 -> '21:36').
 * - Invalid, negative, NaN, infinite, or non-numeric inputs return '0:00'.
 */
export function formatPlaybackTime(seconds: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || Number.isNaN(seconds)) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
  return `${minutes}:${paddedSeconds}`;
}
