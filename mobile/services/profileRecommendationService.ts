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
    if (isSevere) {
        return { session: null, reason: '' };
    }

    // Defensive array validation and normalization
    const triggers = Array.isArray(anxietyTriggers)
        ? anxietyTriggers.filter(
            (trigger): trigger is string => typeof trigger === 'string'
          )
        : [];

    // 1. Highest priority: loud noises or fireworks
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

export type HomeRecommendationSource = 'profile' | 'free_baseline' | 'none';

export interface HomeRecommendationResult extends RecommendationResult {
    source: HomeRecommendationSource;
}

export function getHomeRecommendation(
    sessions: Session[],
    anxietyTriggers: readonly any[] | null | undefined,
    isSevere: boolean,
    isPremium: boolean
): HomeRecommendationResult {
    if (isSevere) {
        return { session: null, reason: '', source: 'none' };
    }

    // Normalize anxietyTriggers dynamically
    const triggers = Array.isArray(anxietyTriggers)
        ? anxietyTriggers.filter(
            (t): t is string => typeof t === 'string'
          )
        : [];

    // 1. Highest priority safety trigger: loud noises or fireworks
    if (triggers.includes('loud_noises') || triggers.includes('fireworks')) {
        const found = sessions.find(s => s.id === 'fireworks_loud_noises_basic');
        if (found && found.accessLevel === 'free') {
            return {
                session: found,
                reason: 'Profile match: loud noises or fireworks',
                source: 'profile'
            };
        }
        return { session: null, reason: '', source: 'none' };
    }

    // 2. Confirmed Premium: use the trigger-specific matrix
    if (isPremium) {
        const result = getProfileRecommendation(sessions, anxietyTriggers, isSevere);
        if (result.session) {
            return {
                session: result.session,
                reason: result.reason,
                source: 'profile'
            };
        }
        return { session: null, reason: '', source: 'none' };
    }

    // 3. Confirmed Non-Premium baseline: Daily Calm Reset
    const baseline = sessions.find(s => s.id === 'daily_calm_reset');
    if (baseline && baseline.accessLevel === 'free') {
        return {
            session: baseline,
            reason: 'A simple place to start',
            source: 'free_baseline'
        };
    }

    return { session: null, reason: '', source: 'none' };
}
