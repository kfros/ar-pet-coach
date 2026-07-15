import { Session } from '../types/Session';

export interface RecommendationResult {
    session: Session | null;
    reason: string;
}

export function getProfileRecommendation(
    sessions: Session[],
    anxietyTriggers: readonly any[] | null | undefined,
    isSevere: boolean
): RecommendationResult {
    // Defensive array validation and normalization
    const triggers = Array.isArray(anxietyTriggers)
        ? anxietyTriggers.filter(
            (trigger): trigger is string => typeof trigger === 'string'
          )
        : [];

    // 1. Highest priority: loud noises or fireworks
    // Noise/fireworks still selects the safe-space routine even when isSevere is true (CP-SAFE-002 behavior not added here).
    if (triggers.includes('loud_noises') || triggers.includes('fireworks')) {
        const found = sessions.find(s => s.id === 'fireworks_loud_noises_basic');
        return {
            session: found || null,
            reason: found ? 'Profile match: loud noises or fireworks' : ''
        };
    }

    // 2. Outdoor triggers (new places, traffic, nighttime, not sure) - only if not severe
    if (!isSevere && (
        triggers.includes('new_places') ||
        triggers.includes('traffic_car_horns') ||
        triggers.includes('nighttime') ||
        triggers.includes('not_sure')
    )) {
        const found = sessions.find(s => s.id === 'outdoor_confidence_reset');
        return {
            session: found || null,
            reason: found ? 'Outdoor threshold practice for new places/worry' : ''
        };
    }

    // 3. Visitors trigger
    if (triggers.includes('visitors')) {
        const found = sessions.find(s => s.id === 'visitors_at_home');
        return {
            session: found || null,
            reason: found ? 'Practice calm distance for visitors' : ''
        };
    }

    // 4. Being alone trigger
    if (triggers.includes('being_alone')) {
        const found = sessions.find(s => s.id === 'being_alone');
        return {
            session: found || null,
            reason: found ? 'Practice tiny distance for being alone' : ''
        };
    }

    // 5. Vet visits trigger
    if (triggers.includes('vet_visits')) {
        const found = sessions.find(s => s.id === 'vet_visit_prep');
        return {
            session: found || null,
            reason: found ? 'Low-pressure prep for handling & vet visits' : ''
        };
    }

    // 6. Default: Daily Calm Reset
    const defaultSession = sessions.find(s => s.id === 'daily_calm_reset');
    return {
        session: defaultSession || null,
        reason: defaultSession ? 'Start here: short and easy' : ''
    };
}
