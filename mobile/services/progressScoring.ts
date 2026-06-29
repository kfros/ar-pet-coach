import { AnxietyLevel, AnxietySign, CheckIn, PositiveSign, CheckInProfile } from '../types/Session';

export interface ScoreResult {
    score: number;
    hasSevereSigns: boolean;
    severeCategory?: 'behavioral' | 'medical';
    severeSignsNote?: string;
    positiveSigns: string[];
}

export type OutcomeType = 
    | 'improved' 
    | 'worsened' 
    | 'unchanged' 
    | 'mixed' 
    | 'stopped_early' 
    | 'severe_signs' 
    | 'no_checkins';

export const LEVEL_BASE_SCORES: Record<AnxietyLevel, number> = {
    calm: 0,
    mild: 3,
    moderate: 6,
    high: 9
};

export const STRESS_SIGN_WEIGHTS: Record<AnxietySign, number> = {
    hiding: 1,
    trembling_or_shaking: 1,
    panting: 1,
    pacing_or_restless: 1,
    owner_seeking: 1,
    scanning_or_alert: 1,
    freezing: 2,
    barking_whining_howling: 1,
    drooling: 1,
    bolting_or_escape_attempts: 3,
    not_accepting_treats: 2,
    aggression: 3,
    self_harm: 4,
    collapse_or_breathing_trouble: 5,
    repeated_vomiting_or_diarrhea: 4,
    unable_to_settle: 1,
    clawing_or_scratching_exits: 2,
    cannot_urinate: 5,
    straining_or_only_drops: 4,
    blood_in_urine_or_stool: 5,
    pain_while_pottying: 4,
    repeated_unsuccessful_potty_attempts: 4,
    lethargy_or_weakness: 4,
    sudden_major_potty_change: 4,
    other: 1
};

export const POSITIVE_SIGN_WEIGHTS: Record<PositiveSign, number> = {
    relaxed_body: 1,
    soft_eyes: 1,
    slower_breathing: 1,
    settled_nearby: 1,
    took_treats_calmly: 1,
    resting_or_lying_down: 1,
    less_pacing: 1,
    more_responsive: 1,
    chose_safe_spot: 1,
    accepted_food_or_chew: 1,
    rested_between_noises: 1,
    settled_near_owner: 1,
    returned_to_room: 1,
    explored_again: 1,
    recovered_after_hiding: 1,
    slept_after_event: 2,
    fell_asleep: 2
};

export const BEHAVIORAL_SEVERE_SIGNS: AnxietySign[] = [
    'aggression',
    'self_harm',
    'bolting_or_escape_attempts'
];

export const MEDICAL_SEVERE_SIGNS: AnxietySign[] = [
    'collapse_or_breathing_trouble',
    'repeated_vomiting_or_diarrhea',
    'cannot_urinate',
    'straining_or_only_drops',
    'blood_in_urine_or_stool',
    'pain_while_pottying',
    'repeated_unsuccessful_potty_attempts',
    'lethargy_or_weakness',
    'sudden_major_potty_change'
];

const BEHAVIORAL_NOTE = "For panic, aggression, self-injury, or escape attempts, stop the routine and get professional support.";
const MEDICAL_NOTE = "For medical symptoms or severe distress, contact a veterinarian.";

export const calculateCheckinScore = (checkin?: CheckIn, profile?: CheckInProfile): ScoreResult => {
    if (!checkin) {
        return { score: 0, hasSevereSigns: false, positiveSigns: [] };
    }

    const base = LEVEL_BASE_SCORES[checkin.overallLevel] || 0;
    
    let stressSignScore = 0;
    let hasSevereSigns = false;
    let severeCategory: 'behavioral' | 'medical' | undefined;
    let severeSignsNote: string | undefined;

    // Build lookup maps from the profile if provided
    const stressWeights: Record<string, number> = {};
    const severeSafety: Record<string, 'behavioral_stop' | 'medical_stop' | 'caution' | 'none'> = {};
    
    if (profile) {
        profile.stressSigns.forEach(s => {
            stressWeights[s.id] = s.scoreWeight ?? 1;
        });
        profile.severeSigns.forEach(s => {
            stressWeights[s.id] = s.scoreWeight ?? 1;
            severeSafety[s.id] = s.safetyLevel ?? 'none';
        });
    } else {
        // Fallback to original STRESS_SIGN_WEIGHTS
        Object.entries(STRESS_SIGN_WEIGHTS).forEach(([id, weight]) => {
            stressWeights[id] = weight;
        });
        BEHAVIORAL_SEVERE_SIGNS.forEach(id => {
            severeSafety[id] = 'behavioral_stop';
        });
        MEDICAL_SEVERE_SIGNS.forEach(id => {
            severeSafety[id] = 'medical_stop';
        });
    }

    if (checkin.selectedSigns) {
        checkin.selectedSigns.forEach(sign => {
            stressSignScore += stressWeights[sign] ?? 1;
            
            const safety = severeSafety[sign];
            if (safety === 'medical_stop') {
                hasSevereSigns = true;
                severeCategory = 'medical';
                severeSignsNote = MEDICAL_NOTE;
            } else if (safety === 'behavioral_stop' && severeCategory !== 'medical') {
                hasSevereSigns = true;
                severeCategory = 'behavioral';
                severeSignsNote = BEHAVIORAL_NOTE;
            }
        });
    }

    let rawPositiveBonus = 0;
    const positiveSignsStrings: string[] = [];
    
    if (profile) {
        if (profile.showPositiveSignsAfter && profile.positiveSigns && checkin.positiveSigns) {
            const positiveWeights: Record<string, number> = {};
            profile.positiveSigns.forEach(s => {
                positiveWeights[s.id] = s.scoreWeight ?? 1;
            });
            checkin.positiveSigns.forEach(sign => {
                rawPositiveBonus += positiveWeights[sign] ?? 1;
                positiveSignsStrings.push(sign.replace(/_/g, ' '));
            });
        }
    } else {
        if (checkin.positiveSigns) {
            checkin.positiveSigns.forEach(sign => {
                rawPositiveBonus += POSITIVE_SIGN_WEIGHTS[sign] ?? 1;
                positiveSignsStrings.push(sign.replace(/_/g, ' '));
            });
        }
    }

    const positiveBonus = (profile && profile.id === 'outdoor_confidence') ? 0 : Math.min(rawPositiveBonus, 2);
    const rawScore = base + stressSignScore - positiveBonus;
    const score = Math.max(0, Math.min(10, rawScore));

    return {
        score,
        hasSevereSigns,
        severeCategory,
        severeSignsNote,
        positiveSigns: positiveSignsStrings
    };
};

export const getLevelLabelFromScore = (score: number): string => {
    if (score <= 1) return "Low signs";
    if (score <= 4) return "Mild signs";
    if (score <= 7) return "Moderate signs";
    return "High signs";
};

export const getProgressOutcome = (
    beforeScore: number, 
    afterScore: number, 
    flags: { stoppedEarly: boolean, hasSevereSigns: boolean, hasBefore: boolean, hasAfter: boolean, hasPositiveSigns: boolean }
): OutcomeType => {
    if (flags.hasSevereSigns) return 'severe_signs';
    if (flags.stoppedEarly) return 'stopped_early';
    if (!flags.hasBefore || !flags.hasAfter) return 'no_checkins';

    const delta = afterScore - beforeScore;

    if (delta <= -2) return 'improved';
    if (delta >= 2) return 'worsened';
    if (Math.abs(delta) < 2 && flags.hasPositiveSigns) return 'mixed';
    return 'unchanged';
};

export const getTrendLabel = (latestScore: number, previousScore: number | null): string | null => {
    if (previousScore === null) return null;
    
    const delta = latestScore - previousScore;
    if (delta <= -2) return "Lower than last check-in.";
    if (delta >= 2) return "Higher than last check-in.";
    return "About the same as last check-in.";
};

export const OUTCOME_TEMPLATES = {
    improved: [
        "Your dog showed calmer signs after the routine.",
        "Positive signs showed up after this session.",
        "This routine may be worth trying again when signs are mild."
    ],
    unchanged_mixed: [
        "Overall signs were similar, but positive signs were noted.",
        "This may still be useful as an easy routine."
    ],
    unchanged: [
        "Signs looked about the same after the session."
    ],
    worsened: [
        "This may have been too much today.",
        "Try a shorter or easier routine next time.",
        "Start with fewer steps next time."
    ],
    stopped_early: [
        "Stopping early was the right choice if signs increased.",
        "Use an easier step next time."
    ],
    severe: [
        "Strong signs were noted. Stop routines if these signs appear.",
        "Consider veterinary or qualified behavior support if this happens often."
    ]
};

export const getOutcomeCopy = (outcome: OutcomeType, hasPositive: boolean): string[] => {
    switch (outcome) {
        case 'improved':
            return [OUTCOME_TEMPLATES.improved[0], OUTCOME_TEMPLATES.improved[1], OUTCOME_TEMPLATES.improved[2]];
        case 'mixed':
            return [OUTCOME_TEMPLATES.unchanged_mixed[0], OUTCOME_TEMPLATES.unchanged_mixed[1]];
        case 'unchanged':
            return [OUTCOME_TEMPLATES.unchanged[0]];
        case 'worsened':
            return [OUTCOME_TEMPLATES.worsened[0], OUTCOME_TEMPLATES.worsened[1]];
        case 'stopped_early':
            return [OUTCOME_TEMPLATES.stopped_early[0], OUTCOME_TEMPLATES.stopped_early[1]];
        case 'severe_signs':
            return [OUTCOME_TEMPLATES.severe[0], OUTCOME_TEMPLATES.severe[1]];
        default:
            return [];
    }
};
