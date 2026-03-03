/**
 * Shared anxiety gradient utilities.
 * Used by DashboardScreen and AnalysisScreen for consistent
 * color/label/description across the app.
 */

const GRADIENT_STOPS = [
    { score: 0, color: '#10B981' },  // Green
    { score: 3, color: '#10B981' },  // Green
    { score: 4, color: '#F59E0B' },  // Amber
    { score: 6, color: '#F97316' },  // Orange
    { score: 7, color: '#EF4444' },  // Red
    { score: 10, color: '#EF4444' }, // Red
];

/** Returns a hex color for a given anxiety score (0–10). */
export function getAnxietyColor(score: number): string {
    if (score <= 3) return '#10B981';
    if (score <= 5) return '#D97706'; // Calm amber
    if (score <= 7) return '#F97316';
    return '#EF4444';
}

/** Returns a soft background tint matching the anxiety level. */
export function getAnxietyBgColor(score: number): string {
    if (score <= 3) return '#F0FDF4'; // green tint
    if (score <= 5) return '#FFFBEB'; // amber tint
    if (score <= 7) return '#FFF7ED'; // orange tint
    return '#FEF2F2';                 // red tint
}

/** Returns a short label: Low / Moderate / Elevated / High. */
export function getAnxietyLabel(score: number): string {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Moderate';
    if (score <= 8) return 'Elevated';
    return 'High';
}

/** Returns a calm micro-copy description. */
export function getAnxietyDescription(score: number): string {
    if (score <= 3) return 'Low anxiety detected — your pup is doing great';
    if (score <= 6) return 'Moderate anxiety detected — consider a calming session';
    if (score <= 8) return 'Elevated anxiety detected — a safe zone session is recommended';
    return 'High anxiety detected — immediate calming intervention suggested';
}
