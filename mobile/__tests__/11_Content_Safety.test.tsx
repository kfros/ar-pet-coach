import { lintContent, lintRoutine } from '../content/contentSafetyLinter';
import SessionService from '../services/sessionService';

describe('Content Safety Linter', () => {
    test('flags forbidden clinical words', () => {
        const clinicalContent = "This is a treatment to cure anxiety and diagnose clinical score.";
        const results = lintContent(clinicalContent, 'test_location');
        
        const forbiddenTerms = results.map(r => r.forbiddenTerm);
        expect(forbiddenTerms).toContain('treatment');
        expect(forbiddenTerms).toContain('cure');
        expect(forbiddenTerms).toContain('diagnose');
        expect(forbiddenTerms).toContain('clinical score');
    });

    test('flags AR/Bark/AI claims', () => {
        const techClaims = "Uses AI detected bark analysis and AR guided sessions.";
        const results = lintContent(techClaims, 'test_location');
        
        const forbiddenTerms = results.map(r => r.forbiddenTerm);
        expect(forbiddenTerms).toContain('AI detected');
        expect(forbiddenTerms).toContain('bark analysis');
        expect(forbiddenTerms).toContain('AR guided');
    });

    test('allows preferred safe wording', () => {
        const safeContent = "This routine may help support your dog at their own pace.";
        const results = lintContent(safeContent, 'test_location');
        expect(results.length).toBe(0);
    });

    test('all current routines pass the linter', () => {
        const allRoutines = SessionService.getSessions();
        let allViolations: any[] = [];
        
        allRoutines.forEach(routine => {
            const violations = lintRoutine(routine);
            if (violations.length > 0) {
                allViolations = [...allViolations, ...violations];
            }
        });

        expect(allViolations).toEqual([]);
    });
});
