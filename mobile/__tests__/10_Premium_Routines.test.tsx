import SessionService from '../services/sessionService';

describe('Premium Routines Data Integrity', () => {
    const premiumRoutines = SessionService.getSessions().filter(s => s.accessLevel === 'premium');

    test('all 4 premium routines exist', () => {
        const expectedIds = ['fireworks_prep_routine', 'visitors_at_home', 'being_alone', 'vet_visit_prep'];
        expectedIds.forEach(id => {
            const routine = premiumRoutines.find(r => r.id === id);
            expect(routine).toBeDefined();
        });
    });

    test('premium routines have icon mapping', () => {
        premiumRoutines.forEach(routine => {
            expect(routine.iconKey).toBeDefined();
            expect(typeof routine.iconKey).toBe('string');
        });
    });

    test('premium routines have required safety fields', () => {
        premiumRoutines.forEach(routine => {
            expect(routine.beforeCheckinEnabled).toBe(true);
            expect(routine.afterCheckinEnabled).toBe(true);
            expect(routine.severeNoticeEnabled).toBe(true);
            expect(routine.safetyNotes).toBeDefined();
            expect(routine.safetyNotes?.length).toBeGreaterThan(0);
            expect(routine.stopIf.length).toBeGreaterThan(0);
        });
    });

    test('premium routines have descriptive fields', () => {
        premiumRoutines.forEach(routine => {
            expect(routine.suitableFor?.length).toBeGreaterThan(0);
            expect(routine.notFor?.length).toBeGreaterThan(0);
            expect(routine.description).toBeDefined();
            expect(routine.suggestedTimeCopy).toBeDefined();
        });
    });

    test('steps have duration and instruction', () => {
        premiumRoutines.forEach(routine => {
            routine.steps.forEach(step => {
                expect(step.durationSeconds).toBeGreaterThan(0);
                expect(step.instruction).toBeDefined();
            });
        });
    });
});
