import { PREMIUM_SESSIONS } from '../appContent/premiumRoutines';

describe('Post-Fireworks Recovery at Home Routine Tests', () => {
    const routine = PREMIUM_SESSIONS.find(r => r.id === 'post_fireworks_recovery_home');

    test('routine exists in PREMIUM_SESSIONS', () => {
        expect(routine).toBeDefined();
    });

    if (!routine) return; // Escape typescript warning for remainder of tests

    test('routine has correct metadata', () => {
        expect(routine.id).toBe('post_fireworks_recovery_home');
        expect(routine.title).toBe('Post-Fireworks Recovery at Home');
        expect(routine.subtitle).toBe('Calm support after the noise has stopped.');
        expect(routine.accessLevel).toBe('premium');
        expect(routine.category).toBe('noise_support');
        expect(routine.categoryLabel).toBe('Noise & Fireworks');
        expect(routine.checkInProfileId).toBe('noise_support');
        expect(routine.backgroundSoundPolicy?.mode).toBe('none');
        expect(routine.iconKey).toBe('home');
        expect(routine.difficulty).toBe('easy');
    });

    // Helper to gather all user-facing copy of the new routine
    const gatherUserFacingCopy = (includeFallbacks = true): string[] => {
        const copy: string[] = [];
        if (routine.title) copy.push(routine.title);
        if (routine.subtitle) copy.push(routine.subtitle);
        if (routine.description) copy.push(routine.description);
        if (routine.goal) copy.push(routine.goal);
        
        if (routine.suitableFor) copy.push(...routine.suitableFor);
        if (routine.notFor) copy.push(...routine.notFor);
        if (routine.sourcePrinciples) copy.push(...routine.sourcePrinciples);
        if (routine.safetyNotes) copy.push(...routine.safetyNotes);
        if (routine.beforeYouStart) copy.push(...routine.beforeYouStart);
        if (routine.afterSession) copy.push(...routine.afterSession);

        if (routine.steps) {
            routine.steps.forEach(step => {
                if (step.title) copy.push(step.title);
                if (step.instruction) copy.push(step.instruction);
            });
        }

        if (includeFallbacks && routine.fallbacks) {
            routine.fallbacks.forEach(fb => {
                if (fb.title) copy.push(fb.title);
                if (fb.body) copy.push(fb.body);
            });
        }

        return copy;
    };

    test('stage separation rules are respected', () => {
        const copyStr = gatherUserFacingCopy(true).join(' ').toLowerCase();
        const mainCopyStr = gatherUserFacingCopy(false).join(' ').toLowerCase();

        // Must say/imply it is for after the noise has stopped/dropped to baseline
        expect(
            copyStr.includes('after the noise has stopped') || 
            copyStr.includes('after the loud event has stopped') ||
            copyStr.includes('dropped to baseline')
        ).toBe(true);

        // Must NOT suggest use during active noises
        expect(copyStr).not.toContain('during active fireworks');
        expect(copyStr).not.toContain('during active thunder');

        // Must NOT include outdoor threshold or walk practice
        expect(mainCopyStr).not.toContain('outdoor threshold');
        expect(mainCopyStr).not.toContain('walk practice');
        expect(mainCopyStr).not.toContain('walk rebuild');

        // Fallbacks verification
        const fallbackIds = routine.fallbacks?.map(f => f.routineId) || [];
        expect(fallbackIds).toContain('fireworks_loud_noises_basic');
        expect(fallbackIds).toContain('post_fireworks_walk_rebuild');
        expect(fallbackIds).toContain('daily_calm_reset');
    });

    test('safety copy and boundaries are respected', () => {
        const copyStr = gatherUserFacingCopy().join(' ').toLowerCase();

        // Warns against forcing the dog out of hiding
        expect(
            copyStr.includes('do not force') ||
            copyStr.includes('do not pull') ||
            copyStr.includes('allow the dog to stay') ||
            copyStr.includes('allow hiding')
        ).toBe(true);

        // Warns against forced contact or forced food
        expect(copyStr.includes('without forced contact') || copyStr.includes('optional and calm')).toBe(true);
        expect(copyStr.includes('without pressure') || copyStr.includes('don’t force them')).toBe(true);

        // Warns against punishment or scolding
        expect(copyStr.includes('punish') || copyStr.includes('scold')).toBe(true);

        // Mentions professional support boundaries
        expect(copyStr.includes('veterinarian') || copyStr.includes('veterinary behaviorist')).toBe(true);
        expect(
            copyStr.includes('severe') || 
            copyStr.includes('unsafe') || 
            copyStr.includes('persistent') || 
            copyStr.includes('escalating') || 
            copyStr.includes('recurrent')
        ).toBe(true);
        expect(
            copyStr.includes('injury') ||
            copyStr.includes('collapse') ||
            copyStr.includes('breathing') ||
            copyStr.includes('seizure') ||
            copyStr.includes('emergency')
        ).toBe(true);
    });

    test('no audio/masking claims or medical product names', () => {
        const copyStr = gatherUserFacingCopy().join(' ').toLowerCase();

        // No audio/masking
        expect(copyStr).not.toContain('white noise');
        expect(copyStr).not.toContain('brown noise');
        expect(copyStr).not.toContain('masking library');
        expect(copyStr).not.toContain('volume ladder');
        expect(copyStr).not.toContain('sound exposure');

        // No meds, CBD, pheromones, supplements, dosages
        expect(copyStr).not.toContain('cbd');
        expect(copyStr).not.toContain('pheromone');
        expect(copyStr).not.toContain('supplement');
        expect(copyStr).not.toContain('dosage');
        expect(copyStr).not.toContain('sileo');
        expect(copyStr).not.toContain('gabapentin');
        expect(copyStr).not.toContain('clomicalm');
        expect(copyStr).not.toContain('trazodone');
        expect(copyStr).not.toContain('xanax');
        expect(copyStr).not.toContain('alprazolam');
    });

    test('forbidden wording is not present in copy', () => {
        const copyList = gatherUserFacingCopy();
        
        // Exact words to check with word boundary logic
        const forbiddenWords = [
            'cure', 'fix', 'treatment', 'therapy', 'heal trauma', 'ptsd', 'phobia',
            'desensitization', 'counterconditioning', 'guaranteed', 'proven protocol',
            'get over it', 'push through', 'ignore fear', 'walk it off'
        ];

        // Specific check for "treat" but allowing "treats" (though we didn't use treats, we allow it for future proofing)
        // Match exact word "treat" or "treatments", but ignore "treats"
        const treatRegex = /\b(treat|treatment|treatments)\b/i;

        copyList.forEach(text => {
            const lowerText = text.toLowerCase();
            forbiddenWords.forEach(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'i');
                expect(text).not.toMatch(regex);
            });
            expect(text).not.toMatch(treatRegex);
        });
    });

    test('routine has exactly 6 steps with indoor-only focus', () => {
        expect(routine.steps.length).toBe(6);

        const stepIds = routine.steps.map(s => s.id);
        expect(stepIds).toEqual([
            'recovery_noise_over_check',
            'recovery_keep_safe_place',
            'recovery_lower_room_pressure',
            'recovery_presence_no_demands',
            'recovery_resources_no_force',
            'recovery_watch_softening'
        ]);

        // None of the steps should mention outdoor areas
        routine.steps.forEach(step => {
            const stepStr = (step.title + ' ' + step.instruction).toLowerCase();
            expect(stepStr).not.toContain('walk');
            expect(stepStr).not.toContain('yard');
            expect(stepStr).not.toContain('outside');
            expect(stepStr).not.toContain('street');
            expect(stepStr).not.toContain('doorway');
        });
    });
});
