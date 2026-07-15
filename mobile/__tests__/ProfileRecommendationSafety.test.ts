import { getProfileRecommendation } from '../services/profileRecommendationService';
import { Session } from '../types/Session';

describe('ProfileRecommendationSafety - getProfileRecommendation pure selector tests', () => {
    const mockSessions: Session[] = [
        { id: 'daily_calm_reset', accessLevel: 'free', title: 'Daily Calm Reset', steps: [] } as any,
        { id: 'fireworks_loud_noises_basic', accessLevel: 'free', title: 'Thunder & Fireworks Safe Space', steps: [] } as any,
        { id: 'fireworks_prep_routine', accessLevel: 'premium', title: 'Fireworks Prep: Calm-Day Practice', steps: [] } as any,
        { id: 'outdoor_confidence_reset', accessLevel: 'free', title: 'Outdoor Confidence Reset', steps: [] } as any,
        { id: 'visitors_at_home', accessLevel: 'free', title: 'Visitors at Home', steps: [] } as any,
        { id: 'being_alone', accessLevel: 'free', title: 'Being Alone', steps: [] } as any,
        { id: 'vet_visit_prep', accessLevel: 'free', title: 'Vet Visit Prep', steps: [] } as any,
    ];

    test('loud_noises selects fireworks_loud_noises_basic for non-Premium/Premium inputs indifferently', () => {
        const result = getProfileRecommendation(mockSessions, ['loud_noises'], false);
        expect(result.session?.id).toBe('fireworks_loud_noises_basic');
        expect(result.reason).toBe('Profile match: loud noises or fireworks');
    });

    test('fireworks selects fireworks_loud_noises_basic indifferently', () => {
        const result = getProfileRecommendation(mockSessions, ['fireworks'], false);
        expect(result.session?.id).toBe('fireworks_loud_noises_basic');
        expect(result.reason).toBe('Profile match: loud noises or fireworks');
    });

    test('noise/fireworks returns null when isSevere is true', () => {
        const result = getProfileRecommendation(mockSessions, ['loud_noises'], true);
        expect(result.session).toBeNull();
        expect(result.reason).toBe('');
    });

    test('loud_noises wins over new_places and other outdoor triggers', () => {
        const result = getProfileRecommendation(mockSessions, ['new_places', 'loud_noises'], false);
        expect(result.session?.id).toBe('fireworks_loud_noises_basic');
    });

    test('fireworks wins over traffic_car_horns and nighttime', () => {
        const result = getProfileRecommendation(mockSessions, ['traffic_car_horns', 'nighttime', 'fireworks'], false);
        expect(result.session?.id).toBe('fireworks_loud_noises_basic');
    });

    test('loud_noises/fireworks wins over visitors, being_alone, and vet_visits', () => {
        const result1 = getProfileRecommendation(mockSessions, ['visitors', 'loud_noises'], false);
        expect(result1.session?.id).toBe('fireworks_loud_noises_basic');

        const result2 = getProfileRecommendation(mockSessions, ['being_alone', 'fireworks'], false);
        expect(result2.session?.id).toBe('fireworks_loud_noises_basic');

        const result3 = getProfileRecommendation(mockSessions, ['vet_visits', 'loud_noises'], false);
        expect(result3.session?.id).toBe('fireworks_loud_noises_basic');
    });

    test('no profile-trigger combination returns fireworks_prep_routine', () => {
        const triggersCombos = [
            ['loud_noises'],
            ['fireworks'],
            ['loud_noises', 'fireworks'],
            ['loud_noises', 'new_places'],
            ['fireworks', 'visitors'],
        ];

        for (const triggers of triggersCombos) {
            const result = getProfileRecommendation(mockSessions, triggers, false);
            expect(result.session?.id).not.toBe('fireworks_prep_routine');
        }
    });

    test('missing fireworks_loud_noises_basic definition returns null and never substitutes fireworks_prep_routine or daily_calm_reset', () => {
        const incompleteSessions = mockSessions.filter(s => s.id !== 'fireworks_loud_noises_basic');
        const result = getProfileRecommendation(incompleteSessions, ['loud_noises'], false);
        expect(result.session).toBeNull();
        expect(result.reason).toBe('');
    });

    test('preserves existing non-noise priority and severe-sign behavior', () => {
        // Severe sign blocks outdoor and returns null suggestion
        const resultSevereOutdoor = getProfileRecommendation(mockSessions, ['new_places'], true);
        expect(resultSevereOutdoor.session).toBeNull();

        // Non-severe outdoor trigger resolves correctly
        const resultOutdoor = getProfileRecommendation(mockSessions, ['new_places'], false);
        expect(resultOutdoor.session?.id).toBe('outdoor_confidence_reset');

        // Other triggers resolve correctly
        const resultVisitors = getProfileRecommendation(mockSessions, ['visitors'], false);
        expect(resultVisitors.session?.id).toBe('visitors_at_home');

        const resultBeingAlone = getProfileRecommendation(mockSessions, ['being_alone'], false);
        expect(resultBeingAlone.session?.id).toBe('being_alone');

        const resultVet = getProfileRecommendation(mockSessions, ['vet_visits'], false);
        expect(resultVet.session?.id).toBe('vet_visit_prep');
    });

    test('empty, undefined, null, and malformed trigger inputs do not throw and preserve default daily_calm_reset behavior', () => {
        const inputs: any[] = [
            [],
            undefined,
            null,
            'not-an-array',
            { some: 'object' },
            12345,
            [123, null, { trigger: 'loud_noises' }, 'new_places', 456]
        ];

        for (const input of inputs) {
            expect(() => {
                const result = getProfileRecommendation(mockSessions, input, false);
                if (Array.isArray(input) && input.includes('new_places')) {
                    // Mixed array with 'new_places' string should filter out non-strings and match 'new_places'
                    expect(result.session?.id).toBe('outdoor_confidence_reset');
                } else {
                    expect(result.session?.id).toBe('daily_calm_reset');
                }
            }).not.toThrow();
        }
    });
});
