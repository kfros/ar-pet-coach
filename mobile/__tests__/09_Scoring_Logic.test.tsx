import { 
    calculateCheckinScore, 
    getLevelLabelFromScore, 
    getProgressOutcome, 
    getTrendLabel,
    LEVEL_BASE_SCORES
} from '../services/progressScoring';
import { CheckIn, SessionHistoryEntry } from '../types/Session';
import SessionService from '../services/sessionService';

describe('Scoring Logic', () => {
    
    describe('calculateCheckinScore', () => {
        test('calm_no_signs_score_is_zero', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'calm',
                selectedSigns: [],
                positiveSigns: []
            };
            const result = calculateCheckinScore(checkin);
            expect(result.score).toBe(0);
        });

        test('mild_with_multiple_signs', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'mild',
                selectedSigns: ['hiding', 'panting'], // 1 + 1 = 2
                positiveSigns: []
            };
            // Mild base is 3. 3 + 2 = 5.
            const result = calculateCheckinScore(checkin);
            expect(result.score).toBe(5);
        });

        test('positive_bonus_is_capped_at_2', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'moderate', // 6
                selectedSigns: [],
                positiveSigns: ['relaxed_body', 'soft_eyes', 'fell_asleep'] // 1 + 1 + 2 = 4
            };
            // 6 + 0 - min(4, 2) = 4
            const result = calculateCheckinScore(checkin);
            expect(result.score).toBe(4);
        });

        test('unknown_stress_sign_uses_default_weight_1', () => {
            const checkin: any = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'calm',
                selectedSigns: ['mystery_sign'],
                positiveSigns: []
            };
            // 0 + 1 = 1
            const result = calculateCheckinScore(checkin);
            expect(result.score).toBe(1);
        });

        test('old_checkin_without_positiveSigns_does_not_crash', () => {
            const checkin: any = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'mild',
                selectedSigns: ['panting']
                // no positiveSigns field
            };
            const result = calculateCheckinScore(checkin);
            expect(result.score).toBe(4); // 3 + 1
        });

        test('severe_medical_sign_sets_flag', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'mild',
                selectedSigns: ['collapse_or_breathing_trouble'],
                positiveSigns: []
            };
            const result = calculateCheckinScore(checkin);
            expect(result.hasSevereSigns).toBe(true);
            expect(result.severeCategory).toBe('medical');
        });

        test('severe_behavioral_sign_sets_flag', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'mild',
                selectedSigns: ['aggression'],
                positiveSigns: []
            };
            const result = calculateCheckinScore(checkin);
            expect(result.hasSevereSigns).toBe(true);
            expect(result.severeCategory).toBe('behavioral');
        });

        test('positive_signs_do_not_cancel_severe', () => {
            const checkin: CheckIn = {
                id: '1', petId: 'pet1', sessionId: 's1', timestamp: '', phase: 'before',
                overallLevel: 'high',
                selectedSigns: ['aggression'],
                positiveSigns: ['fell_asleep']
            };
            const result = calculateCheckinScore(checkin);
            expect(result.hasSevereSigns).toBe(true);
            // Score might be lower but flag remains
        });
    });

    describe('getProgressOutcome', () => {
        test('outcome_improved_delta_minus_two', () => {
            const outcome = getProgressOutcome(6, 4, { stoppedEarly: false, hasSevereSigns: false, hasBefore: true, hasAfter: true, hasPositiveSigns: false });
            expect(outcome).toBe('improved');
        });

        test('outcome_worsened_delta_plus_two', () => {
            const outcome = getProgressOutcome(4, 6, { stoppedEarly: false, hasSevereSigns: false, hasBefore: true, hasAfter: true, hasPositiveSigns: false });
            expect(outcome).toBe('worsened');
        });

        test('outcome_mixed_when_delta_small_and_positive_signs', () => {
            const outcome = getProgressOutcome(5, 5, { stoppedEarly: false, hasSevereSigns: false, hasBefore: true, hasAfter: true, hasPositiveSigns: true });
            expect(outcome).toBe('mixed');
        });

        test('after_medical_severe_sign_overrides_improved', () => {
            const outcome = getProgressOutcome(8, 4, { stoppedEarly: false, hasSevereSigns: true, hasBefore: true, hasAfter: true, hasPositiveSigns: false });
            expect(outcome).toBe('severe_signs');
        });

        test('stopped_early_without_checkins_returns_stopped_early', () => {
            const outcome = getProgressOutcome(0, 0, { stoppedEarly: true, hasSevereSigns: false, hasBefore: false, hasAfter: false, hasPositiveSigns: false });
            expect(outcome).toBe('stopped_early');
        });

        test('missing_before_or_after_returns_no_checkins_when_not_stopped', () => {
            const outcome = getProgressOutcome(5, 0, { stoppedEarly: false, hasSevereSigns: false, hasBefore: true, hasAfter: false, hasPositiveSigns: false });
            expect(outcome).toBe('no_checkins');
        });

        test('before_severe_but_after_no_severe_can_be_improved', () => {
            // Note: hasSevereSigns flag passed to getProgressOutcome should be from the LATEST check-in
            const outcome = getProgressOutcome(9, 3, { stoppedEarly: false, hasSevereSigns: false, hasBefore: true, hasAfter: true, hasPositiveSigns: false });
            expect(outcome).toBe('improved');
        });
    });

    describe('getPreviousScoreForPet', () => {
        test('previous_score_prefers_same_session_id', () => {
            const history: SessionHistoryEntry[] = [
                { id: '3', petId: 'p1', sessionId: 's1', completedAt: '', durationSeconds: 0, completed: true, stoppedEarly: false, 
                  afterCheckin: { id: 'c3', petId: 'p1', sessionId: 's1', timestamp: '', phase: 'after', overallLevel: 'mild', selectedSigns: [] } },
                { id: '2', petId: 'p1', sessionId: 's2', completedAt: '', durationSeconds: 0, completed: true, stoppedEarly: false, 
                  afterCheckin: { id: 'c2', petId: 'p1', sessionId: 's2', timestamp: '', phase: 'after', overallLevel: 'high', selectedSigns: [] } },
                { id: '1', petId: 'p1', sessionId: 's1', completedAt: '', durationSeconds: 0, completed: true, stoppedEarly: false, 
                  afterCheckin: { id: 'c1', petId: 'p1', sessionId: 's1', timestamp: '', phase: 'after', overallLevel: 'moderate', selectedSigns: [] } }
            ];
            // Current is id:3 (index 0). 
            // Previous same sessionId is id:1 (index 2). Moderate signs = 6.
            // Other previous is id:2 (index 1). High signs = 9.
            const score = SessionService.getPreviousScoreForPet(history, history[0]);
            expect(score).toBe(6);
        });

        test('previous_score_falls_back_to_any_previous_if_no_match', () => {
            const history: SessionHistoryEntry[] = [
                { id: '2', petId: 'p1', sessionId: 's2', completedAt: '', durationSeconds: 0, completed: true, stoppedEarly: false, 
                  afterCheckin: { id: 'c2', petId: 'p1', sessionId: 's2', timestamp: '', phase: 'after', overallLevel: 'mild', selectedSigns: [] } },
                { id: '1', petId: 'p1', sessionId: 's1', completedAt: '', durationSeconds: 0, completed: true, stoppedEarly: false, 
                  afterCheckin: { id: 'c1', petId: 'p1', sessionId: 's1', timestamp: '', phase: 'after', overallLevel: 'moderate', selectedSigns: [] } }
            ];
            // Current is id:2. Previous is id:1. Moderate = 6.
            const score = SessionService.getPreviousScoreForPet(history, history[0]);
            expect(score).toBe(6);
        });
    });

    describe('getTrendLabel', () => {
        test('previous_score_trend_lower', () => {
            const label = getTrendLabel(4, 6);
            expect(label).toBe("Lower than last check-in.");
        });

        test('previous_score_trend_higher', () => {
            const label = getTrendLabel(7, 5);
            expect(label).toBe("Higher than last check-in.");
        });

        test('previous_score_trend_about_same', () => {
            const label = getTrendLabel(5, 6);
            expect(label).toBe("About the same as last check-in.");
        });
    });

    describe('getLevelLabelFromScore', () => {
        test('labels_correctly', () => {
            expect(getLevelLabelFromScore(0)).toBe("Low signs");
            expect(getLevelLabelFromScore(1)).toBe("Low signs");
            expect(getLevelLabelFromScore(2)).toBe("Mild signs");
            expect(getLevelLabelFromScore(4)).toBe("Mild signs");
            expect(getLevelLabelFromScore(5)).toBe("Moderate signs");
            expect(getLevelLabelFromScore(7)).toBe("Moderate signs");
            expect(getLevelLabelFromScore(8)).toBe("High signs");
            expect(getLevelLabelFromScore(10)).toBe("High signs");
        });
    });
});
