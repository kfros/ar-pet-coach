import SessionService from '../services/sessionService';
import { SessionHistoryEntry } from '../types/Session';

describe('Stress Signs Trend Calculations', () => {
    let getLocalHistorySpy: jest.SpyInstance;

    beforeEach(() => {
        getLocalHistorySpy = jest.spyOn(SessionService, 'getLocalHistory');
    });

    afterEach(() => {
        getLocalHistorySpy.mockRestore();
    });

    test('returns not_enough_data when total check-ins is less than minRequiredCheckins', async () => {
        getLocalHistorySpy.mockResolvedValue([]);

        const trend = await SessionService.getStressSignsTrend('pet_1', { minRequiredCheckins: 2 });
        expect(trend.status).toBe('not_enough_data');
        expect(trend.hasEnoughData).toBe(false);
    });

    test('returns severe when latest check-in has severe signs', async () => {
        const history: SessionHistoryEntry[] = [
            {
                id: '1',
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date().toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c1',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date().toISOString(),
                    phase: 'after',
                    overallLevel: 'high',
                    selectedSigns: ['aggression'], // Severe behavioral sign
                    positiveSigns: []
                }
            },
            {
                id: '2',
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date(Date.now() - 86400000).toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c2',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    phase: 'after',
                    overallLevel: 'mild',
                    selectedSigns: [],
                    positiveSigns: []
                }
            }
        ];
        getLocalHistorySpy.mockResolvedValue(history);

        const trend = await SessionService.getStressSignsTrend('pet_1', { minRequiredCheckins: 2 });
        expect(trend.status).toBe('severe');
        expect(trend.hasEnoughData).toBe(true);
        expect(trend.statusTitle).toBe('Strong signs noted');
    });

    test('returns easing status when average score decreases by 1 or more', async () => {
        // e.g. point 1: score 6, point 2: score 4
        // averageDelta = 4 - 6 = -2 <= -1
        const history: SessionHistoryEntry[] = [
            {
                id: '1', // Chronologically second (latest)
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date().toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c1',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date().toISOString(),
                    phase: 'after',
                    overallLevel: 'mild', // Base score 3, selectedSigns: 1 => score 4
                    selectedSigns: ['panting'],
                    positiveSigns: []
                }
            },
            {
                id: '2', // Chronologically first
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date(Date.now() - 86400000).toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c2',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    phase: 'after',
                    overallLevel: 'moderate', // Base score 6, selectedSigns: 0 => score 6
                    selectedSigns: [],
                    positiveSigns: []
                }
            }
        ];
        getLocalHistorySpy.mockResolvedValue(history);

        const trend = await SessionService.getStressSignsTrend('pet_1', { minRequiredCheckins: 2 });
        expect(trend.status).toBe('easing');
        expect(trend.hasEnoughData).toBe(true);
    });

    test('returns increased status when average score increases by 1 or more', async () => {
        // e.g. point 1: score 3, point 2: score 6
        // averageDelta = 6 - 3 = 3 >= 1
        const history: SessionHistoryEntry[] = [
            {
                id: '1', // Chronologically second (latest)
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date().toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c1',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date().toISOString(),
                    phase: 'after',
                    overallLevel: 'moderate', // Base score 6 => score 6
                    selectedSigns: [],
                    positiveSigns: []
                }
            },
            {
                id: '2', // Chronologically first
                petId: 'pet_1',
                sessionId: 'daily_calm_reset',
                completedAt: new Date(Date.now() - 86400000).toISOString(),
                durationSeconds: 100,
                completed: true,
                stoppedEarly: false,
                afterCheckin: {
                    id: 'c2',
                    petId: 'pet_1',
                    sessionId: 'daily_calm_reset',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    phase: 'after',
                    overallLevel: 'mild', // Base score 3 => score 3
                    selectedSigns: [],
                    positiveSigns: []
                }
            }
        ];
        getLocalHistorySpy.mockResolvedValue(history);

        const trend = await SessionService.getStressSignsTrend('pet_1', { minRequiredCheckins: 2 });
        expect(trend.status).toBe('increased');
        expect(trend.hasEnoughData).toBe(true);
    });
});
