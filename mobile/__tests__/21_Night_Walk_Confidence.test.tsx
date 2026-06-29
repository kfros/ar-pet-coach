import SessionService from '../services/sessionService';
import { WALK_FEAR_PREMIUM_SESSIONS } from '../appContent/premiumRoutines/walkFear';
import { PREMIUM_SESSIONS } from '../appContent/premiumRoutines/index';

describe('Night Walk Confidence Routine and Safety Boundaries', () => {
    const sessions = SessionService.getSessions();
    const targetRoutine = sessions.find(s => s.id === 'night_walk_confidence');

    test('routine_presence: routine exists in PREMIUM_SESSIONS and has correct metadata', () => {
        expect(targetRoutine).toBeDefined();
        expect(targetRoutine?.id).toBe('night_walk_confidence');
        expect(targetRoutine?.title).toBe('Night Walk Confidence');
        expect(targetRoutine?.accessLevel).toBe('premium');
        expect(targetRoutine?.category).toBe('walk_fear');
        expect(targetRoutine?.categoryLabel).toBe('Walk Fear & Outdoor Confidence');
        expect(targetRoutine?.checkInProfileId).toBe('outdoor_confidence');
        expect(targetRoutine?.difficulty).toBe('moderate');
        expect(targetRoutine?.backgroundSoundPolicy?.mode).toBe('none');
    });

    test('category_and_aggregation: routine lives in walkFear module and aggregates correctly', () => {
        // Exists in walkFear.ts export
        const inWalkFear = WALK_FEAR_PREMIUM_SESSIONS.find(s => s.id === 'night_walk_confidence');
        expect(inWalkFear).toBeDefined();

        // Included in PREMIUM_SESSIONS aggregation
        const inPremiumAgg = PREMIUM_SESSIONS.find(s => s.id === 'night_walk_confidence');
        expect(inPremiumAgg).toBeDefined();

        // Category checks
        expect(targetRoutine?.category).not.toBe('noise_support');
        expect(targetRoutine?.category).toBe('walk_fear');
    });

    test('stage_and_scope: copy is specific to night walks/low-light and distinct from other routines', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // Mentions evening/night walks or low-light familiar routes
        expect(routineString).toMatch(/night|evening|low-light/);
        expect(routineString).toContain('familiar');

        // Distinct from fireworks rebuild
        expect(routineString).not.toContain('fireworks recovery');
        expect(targetRoutine?.id).not.toBe('post_fireworks_walk_rebuild');
        
        // Distinct from outdoor confidence reset
        expect(targetRoutine?.id).not.toBe('outdoor_confidence_reset');

        // Does not include active-event noise guidance
        expect(routineString).not.toContain('active fireworks');
        expect(routineString).not.toContain('active thunder');
    });

    test('safety_copy: copy enforces safety boundaries, vet-first guidance, and owner safety', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // Safer routes
        expect(routineString).toContain('familiar');
        expect(routineString).toContain('well-lit');
        expect(routineString).toContain('safer');

        // Should warn against force, drag, scold, push
        expect(routineString).toContain('drag');
        expect(routineString).toContain('pull');
        expect(routineString).toContain('scold');
        expect(routineString).toContain('force');

        // Vet-first triggers
        expect(routineString).toContain('veterinarian');
        expect(routineString).toContain('sudden');
        expect(routineString).toContain('vision');
        expect(routineString).toContain('pain');
        expect(routineString).toContain('confusion');
        expect(routineString).toContain('collapse');
        expect(routineString).toContain('breathing trouble');
        expect(routineString).toContain('unsafe');
        expect(routineString).toContain('severe distress');
        expect(routineString).toContain('older');

        // Traffic/unsafe areas
        expect(routineString).toContain('traffic');
        expect(routineString).toContain('unsafe');
    });

    test('audio_policy: routine conforms to strict audio exclusions', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        expect(routineString).not.toContain('in-app audio');
        expect(routineString).not.toContain('sound exposure');
        expect(routineString).not.toContain('recordings');
        expect(routineString).not.toContain('volume ladder');
        expect(targetRoutine?.backgroundSoundPolicy?.mode).toBe('none');
    });

    test('medical_policy: does not diagnose, name medications, or prescribe treatments', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // No medical diagnosis or treatments
        expect(routineString).not.toContain('diagnose');
        expect(routineString).not.toContain('treatment plan');
        
        // No medications, supplements, CBD, dosage
        expect(routineString).not.toContain('cbd');
        expect(routineString).not.toContain('supplement');
        expect(routineString).not.toContain('medication');
        expect(routineString).not.toContain('dosage');
    });

    test('forbidden_wording: contains absolutely no forbidden words/phrases', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        const forbidden = [
            'cure', 'fix', 'therapy', 'phobia',
            'fear of the dark treatment', 'vision treatment', 'cognitive treatment',
            'desensitization', 'counterconditioning', 'guaranteed', 'proven protocol',
            'get over it', 'push through', 'ignore fear', 'walk until they relax', 'make them walk'
        ];

        forbidden.forEach(word => {
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            const hasWord = regex.test(routineString);
            if (hasWord) {
                console.log('Offending forbidden word found:', word);
            }
            expect(hasWord).toBe(false);
        });

        // Ensure we do not use "treatment" or verb forms of "treat" (e.g. treating)
        // Word boundary check for "treat", allowing "treats" inside IDs like "not_accepting_treats"
        // in a strict structural context only.
        const treatMatches = routineString.match(/\btreat\b/g);
        expect(treatMatches).toBeNull();
        
        const treatingMatches = routineString.match(/\btreating\b/g);
        expect(treatingMatches).toBeNull();

        const treatmentMatches = routineString.match(/\btreatment\b/g);
        expect(treatmentMatches).toBeNull();
    });

    test('structure: steps focus on voluntary movement, recovery, and do not require a full walk', () => {
        expect(targetRoutine?.steps).toBeDefined();
        const steps = targetRoutine?.steps || [];
        expect(steps.length).toBe(6);

        const stepTitles = steps.map(s => s.title.toLowerCase());
        const stepInstructions = steps.map(s => s.instruction.toLowerCase());

        // Step 1: Choose the safest familiar route
        expect(stepTitles[0]).toContain('safest familiar route');
        
        // Step 2: Check body and context
        expect(stepTitles[1]).toContain('body and context');

        // Step 3: Start at the bright edge
        expect(stepTitles[2]).toContain('bright edge');

        // Step 4: Invite one tiny segment
        expect(stepTitles[3]).toContain('tiny segment');

        // Step 5: Pause after a startle
        expect(stepTitles[4]).toContain('pause after a startle');

        // Step 6: End before scanning builds
        expect(stepTitles[5]).toContain('before scanning builds');

        // Step 1 should explicitly state it is NOT a full walk
        expect(stepInstructions[0]).toContain('not a full walk');
    });

    test('regression: existing sessions are unmodified', () => {
        const outdoorReset = sessions.find(s => s.id === 'outdoor_confidence_reset');
        expect(outdoorReset).toBeDefined();
        expect(outdoorReset?.title).toBe('Outdoor Confidence Reset');
        expect(outdoorReset?.category).toBe('walk_fear');

        const postFireworks = sessions.find(s => s.id === 'post_fireworks_walk_rebuild');
        expect(postFireworks).toBeDefined();
        expect(postFireworks?.title).toBe('Post-Fireworks Walk Rebuild');
        expect(postFireworks?.category).toBe('walk_fear');
    });
});
